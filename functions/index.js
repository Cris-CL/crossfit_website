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

router.get(["/square/config", "/api/square/config"], async (req, res) => {
  if (!SQUARE_APPLICATION_ID || !SQUARE_LOCATION_ID) {
    return res.status(500).json({ message: "Configuration missing" });
  }

  let pricing = {
    spartan: 4400,
    hyrox_performance: 4950,
    hyrox_strength: 4950
  };

  try {
    const objectIds = [
      "L2ZK4LQ4NSHSNUMZT4KUKX6F",
      "AC6F2TS26EFKPNHNTR4GYQ63",
      "FKFEI77GZUVRWKPNOXET7ZEL"
    ];

    if (squareClient && squareClient.catalogApi) {
      const response = await squareClient.catalogApi.batchRetrieveCatalogObjects({ objectIds });
      const objects = response.result.objects || [];
      if (objects.length > 0) {
        const spartanObj = objects.find(o => o.id === "L2ZK4LQ4NSHSNUMZT4KUKX6F");
        const hyroxPerfObj = objects.find(o => o.id === "AC6F2TS26EFKPNHNTR4GYQ63");
        const hyroxStrObj = objects.find(o => o.id === "FKFEI77GZUVRWKPNOXET7ZEL");

        if (spartanObj && spartanObj.itemVariationData && spartanObj.itemVariationData.priceMoney) {
          pricing.spartan = Number(spartanObj.itemVariationData.priceMoney.amount);
        }
        if (hyroxPerfObj && hyroxPerfObj.itemVariationData && hyroxPerfObj.itemVariationData.priceMoney) {
          pricing.hyrox_performance = Number(hyroxPerfObj.itemVariationData.priceMoney.amount);
        }
        if (hyroxStrObj && hyroxStrObj.itemVariationData && hyroxStrObj.itemVariationData.priceMoney) {
          pricing.hyrox_strength = Number(hyroxStrObj.itemVariationData.priceMoney.amount);
        }
      }
    }
  } catch (error) {
    functions.logger.error("Failed to fetch catalog pricing", error.errors ?? error);
  }

  return res.json({
    appId: SQUARE_APPLICATION_ID,
    locationId: SQUARE_LOCATION_ID,
    pricing
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

    // Map booking type to Square Catalog Item Variation ID
    let variationId = "L2ZK4LQ4NSHSNUMZT4KUKX6F"; // Default spartan
    let itemTitle = "Spartan Training";

    if (booking_type === "hyrox_performance") {
      variationId = "AC6F2TS26EFKPNHNTR4GYQ63";
      itemTitle = "HYROX Race Performance";
    } else if (booking_type === "hyrox_strength") {
      variationId = "FKFEI77GZUVRWKPNOXET7ZEL";
      itemTitle = "HYROX Strength & Conditioning";
    }

    const sessionLabel = `${class_date} ${class_time}`;
    const buyerName = `${first_name || ""} ${last_name || ""}`.trim() || "Athlete";
    const buyerDetails = [buyerName, email, phone].filter(Boolean).join(" / ");
    const paymentNote = `${itemTitle} ${sessionLabel} for ${buyerDetails}`;

    // Inline Payment Flow
    if (sourceId) {
      // 1. Create Order using the Catalog Variation ID
      const orderRequest = {
        idempotencyKey: generateIdempotencyKey(),
        order: {
          locationId: SQUARE_LOCATION_ID,
          lineItems: [
            {
              catalogObjectId: variationId,
              quantity: "1"
            }
          ]
        }
      };

      const orderResponse = await squareClient.ordersApi.createOrder(orderRequest);
      const orderId = orderResponse.result.order.id;
      const amountMoney = orderResponse.result.order.totalMoney;

      // 2. Create Payment attached to the Order
      const paymentRequest = {
        sourceId,
        idempotencyKey,
        amountMoney: amountMoney,
        orderId: orderId,
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
        orderId
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
