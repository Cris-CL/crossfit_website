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
      sourceId,
      verificationToken,
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
    }

    const sessionLabel = `${class_date} ${class_time}`;
    const buyerName = `${first_name || ""} ${last_name || ""}`.trim() || "Athlete";
    const buyerDetails = [buyerName, email, phone].filter(Boolean).join(" / ");
    const paymentNote = `${itemTitle} ${sessionLabel} for ${buyerDetails}`;

    // Inline Payment Flow
    if (sourceId) {
      const money = {
        amount: BigInt(amount), // Square Node SDK uses BigInt for money
        currency: CLASS_PRICE_CURRENCY,
      };

      const paymentRequest = {
        sourceId,
        idempotencyKey,
        amountMoney: money,
        note: paymentNote,
        locationId: SQUARE_LOCATION_ID,
      };

      if (verificationToken) {
        paymentRequest.verificationToken = verificationToken;
      }

      await squareClient.paymentsApi.createPayment(paymentRequest);

      // Log success
      functions.logger.info("Payment successful", {
        class_iso,
        booking_type,
        amount,
      });

      return res.status(200).json({ success: true, message: "Payment processed successfully" });
    }

    // Fallback: Hosted Checkout (Legacy or optional)
    // If sourceId is missing, maybe return error or use checkout link
    // For now, let's keep the checkout link as a fallback ONLY if no sourceId
    // But realistically, frontend requires card entry.

    // Changing behavior: If no sourceId, return 400
    return res.status(400).json({ message: "Payment token (sourceId) is missing." });
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
