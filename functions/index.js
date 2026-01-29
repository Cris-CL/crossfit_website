"use strict";

require("dotenv").config();

const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { customAlphabet } = require("nanoid");
const { Client, Environment } = require("square");

// ----- Environment configuration -----
const {
  SQUARE_ACCESS_TOKEN,
  SQUARE_APPLICATION_ID,
  SQUARE_ENVIRONMENT,
  SQUARE_ENV,
  SQUARE_LOCATION_ID,
  CLASS_PRICE_MINOR = "4400", // amount in the smallest currency unit
  CLASS_PRICE_CURRENCY = "JPY",
} = process.env;

const resolvedEnv = (SQUARE_ENVIRONMENT || SQUARE_ENV || "sandbox").toLowerCase();

if (!SQUARE_ACCESS_TOKEN) {
  functions.logger.warn(
    "SQUARE_ACCESS_TOKEN is not set. Payment attempts will fail.",
  );
}

if (!SQUARE_LOCATION_ID) {
  functions.logger.warn(
    "SQUARE_LOCATION_ID is not set. Payment attempts will fail.",
  );
}

const squareClient = new Client({
  accessToken: SQUARE_ACCESS_TOKEN,
  environment:
    resolvedEnv === "production" ? Environment.Production : Environment.Sandbox,
});

const router = express();
router.use(cors({ origin: true }));
router.use(express.json());

const generateIdempotencyKey = () => customAlphabet("0123456789abcdef", 24)();

router.get(["/square/config", "/api/square/config"], (req, res) => {
  if (!SQUARE_APPLICATION_ID || !SQUARE_LOCATION_ID) {
    return res.status(500).json({ message: "Configuration missing" });
  }
  return res.json({
    appId: SQUARE_APPLICATION_ID,
    locationId: SQUARE_LOCATION_ID
  });
});

router.post(["/square/bookings", "/api/square/bookings"], async (req, res) => {
  try {
    const {
      last_name,
      first_name,
      phone,
      email,
      dob,
      sex,
      notes,
      class_iso,
      class_display,
      class_date,
      class_time,
      redirectUrl,
      booking_type = "spartan", // default to spartan
    } = req.body || {};

    if (!class_iso || !class_date || !class_time) {
      return res.status(400).json({
        message: "Class selection is required before starting checkout.",
      });
    }

    if (!sex) {
      return res.status(400).json({ message: "性別 (Sex) is required." });
    }

    if (!dob) {
      return res.status(400).json({ message: "生年月日 (Date of Birth) is required." });
    }

    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      return res.status(500).json({
        message:
          "Payment processor not configured. Please contact support directly.",
      });
    }

    const idempotencyKey = generateIdempotencyKey();

    // Determine price and label based on booking type
    let amount = 4400; // default spartan
    let itemTitle = "Spartan Training";

    if (booking_type === "hyrox") {
      amount = 4950;
      itemTitle = "HYROX Training";
    } else if (booking_type === "spartan") {
      amount = 4400;
      itemTitle = "Spartan Training";
    } else {
      // Fallback or error? defaulting to spartan above, so this might be redundant unless we want strict checking
      // For now, let's trust the default or the explicit value.
    }

    // Allow override via env var for testing (Spartan default) but keep the logic above for switching
    // Actually, let's strictly use the hardcoded values for these two types as requested.
    // If we wanted to use CLASS_PRICE_MINOR env var as a base override, we'd need logic for that.
    // Given the specific instruction "Spartan (4400) and Hyrox (4950)", I will hardcode them here logic-wise.

    const sessionLabel =
      class_display || `${class_date} ${class_time}` || class_iso;
    const buyerName = `${first_name || ""} ${last_name || ""}`.trim() ||
      "Athlete";
    const paymentNote = `${itemTitle} ${sessionLabel}`;

    const customFields = [
      {
        title: "性別 (Sex)",
        required: true,
        text: { text: String(sex) },
      },
      {
        title: "生年月日 (Date of Birth)",
        required: true,
        text: { text: String(dob) },
      },
    ];

    const checkoutRequest = {
      idempotencyKey,
      order: {
        locationId: SQUARE_LOCATION_ID,
        referenceId: class_iso,
        lineItems: [
          {
            name: `${itemTitle} - ${sessionLabel}`,
            quantity: "1",
            basePriceMoney: {
              amount: amount,
              currency: CLASS_PRICE_CURRENCY,
            },
            note: paymentNote,
          },
        ],
        note: notes ? String(notes) : undefined,
      },
      checkoutOptions: {
        paymentNote: `${paymentNote} for ${buyerName}`,
        redirectUrl:
          typeof redirectUrl === "string" && redirectUrl.startsWith("http")
            ? redirectUrl
            : undefined,
        customFields,
      },
    };

    const { result } = await squareClient.checkoutApi.createPaymentLink(
      checkoutRequest,
    );
    const checkoutUrl = result?.paymentLink?.url;
    if (!checkoutUrl) {
      throw new Error("Square did not return a hosted checkout URL.");
    }

    functions.logger.info("Square hosted checkout created", {
      class_iso,
      paymentLinkId: result.paymentLink?.id,
    });

    return res.status(200).json({ checkoutUrl });
  } catch (error) {
    const details = error.errors ?? error;
    functions.logger.error("Payment request failed", details);

    const message =
      error?.message ||
      error?.errors?.[0]?.detail ||
      "Unable to start checkout.";

    return res.status(500).json({ message });
  }
});

exports.api = functions.https.onRequest(router);
