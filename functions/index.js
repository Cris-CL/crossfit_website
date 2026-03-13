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
  SPARTAN_ID,
  DROPIN_ID,
  HYROX_PERFORMANCE_ID,
  HYROX_STRENGHT_ID,
  TRIAL_ID,
  BOOKING_NOTIFICATION_WEBHOOK,
  CONTACT_FORM_URL,
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
    hyrox_strength: 4950,
    trial: 0,
    dropin: 0
  };

  try {
    const objectIds = [
      SPARTAN_ID,
      HYROX_PERFORMANCE_ID,
      HYROX_STRENGHT_ID,
      TRIAL_ID,
      DROPIN_ID
    ].filter(Boolean);

    if (squareClient && squareClient.catalogApi) {
      const response = await squareClient.catalogApi.batchRetrieveCatalogObjects({ objectIds });
      const objects = response.result.objects || [];
      if (objects.length > 0) {
        const spartanObj = objects.find(o => o.id === SPARTAN_ID);
        const hyroxPerfObj = objects.find(o => o.id === HYROX_PERFORMANCE_ID);
        const hyroxStrObj = objects.find(o => o.id === HYROX_STRENGHT_ID);

        if (spartanObj && spartanObj.itemVariationData && spartanObj.itemVariationData.priceMoney) {
          pricing.spartan = Number(spartanObj.itemVariationData.priceMoney.amount);
        }
        if (hyroxPerfObj && hyroxPerfObj.itemVariationData && hyroxPerfObj.itemVariationData.priceMoney) {
          pricing.hyrox_performance = Number(hyroxPerfObj.itemVariationData.priceMoney.amount);
        }
        if (hyroxStrObj && hyroxStrObj.itemVariationData && hyroxStrObj.itemVariationData.priceMoney) {
          pricing.hyrox_strength = Number(hyroxStrObj.itemVariationData.priceMoney.amount);
        }

        const trialObj = objects.find(o => o.id === TRIAL_ID);
        const dropinObj = objects.find(o => o.id === DROPIN_ID);

        if (trialObj && trialObj.itemVariationData && trialObj.itemVariationData.priceMoney) {
          pricing.trial = Number(trialObj.itemVariationData.priceMoney.amount);
        }
        if (dropinObj && dropinObj.itemVariationData && dropinObj.itemVariationData.priceMoney) {
          pricing.dropin = Number(dropinObj.itemVariationData.priceMoney.amount);
        }
      }
    }
  } catch (error) {
    functions.logger.error("Failed to fetch catalog pricing", error.errors ?? error);
  }

  return res.json({
    appId: SQUARE_APPLICATION_ID,
    locationId: SQUARE_LOCATION_ID,
    environment: resolvedEnv,
    pricing,
  });
});

/**
 * Sends a notification to the configured webhook (Formspree)
 * @param {Object} data Booking data
 */
async function sendBookingNotification(data) {
  if (!BOOKING_NOTIFICATION_WEBHOOK) {
    functions.logger.warn("BOOKING_NOTIFICATION_WEBHOOK is not defined. Skipping notification.");
    return;
  }

  try {
    const response = await fetch(BOOKING_NOTIFICATION_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with status ${response.status}`);
    }
    functions.logger.info("Booking notification sent successfully");
  } catch (error) {
    functions.logger.error("Failed to send booking notification", error);
  }
}

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
      address,
      country,
      postal_code,
      sei,
      mei,
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
    let variationId = SPARTAN_ID; // Default spartan
    let itemTitle = "Spartan Training";

    if (booking_type === "hyrox_performance") {
      variationId = HYROX_PERFORMANCE_ID;
      itemTitle = "HYROX Race Performance";
    } else if (booking_type === "hyrox_strength") {
      variationId = HYROX_STRENGHT_ID;
      itemTitle = "HYROX Strength & Conditioning";
    } else if (booking_type === "trial") {
      variationId = TRIAL_ID;
      itemTitle = "Trial";
    } else if (booking_type === "dropin") {
      variationId = DROPIN_ID;
      itemTitle = "Drop In";
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

      // 3. Send Notification to Webhook
      await sendBookingNotification({
        status: "paid",
        address,
        class_date,
        class_display,
        class_iso,
        class_time,
        country,
        dob,
        email,
        first_name,
        last_name,
        mei,
        notes,
        phone,
        postal_code,
        sei,
        sex,
        booking_type
      });

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

router.post(["/contact/submit", "/api/contact/submit"], async (req, res) => {
  try {
    const {
      inquiryType,
      name,
      phone,
      email,
      message,
      acceptedPrivacy,
      website,
    } = req.body || {};

    const required = {
      inquiryType: String(inquiryType || "").trim(),
      name: String(name || "").trim(),
      phone: String(phone || "").trim(),
      email: String(email || "").trim(),
      message: String(message || "").trim(),
    };

    if (website) {
      // Honeypot field: return success to avoid tipping off bots.
      return res.status(200).json({ success: true });
    }

    if (
      !required.inquiryType ||
      !required.name ||
      !required.phone ||
      !required.email ||
      !required.message
    ) {
      return res.status(400).json({
        message: "Required fields are missing.",
      });
    }

    if (!acceptedPrivacy) {
      return res.status(400).json({
        message: "Privacy policy consent is required.",
      });
    }

    if (!CONTACT_FORM_URL) {
      functions.logger.error("CONTACT_FORM_URL is not configured.");
      return res.status(500).json({
        message: "Contact endpoint is not configured.",
      });
    }

    const payload = {
      inquiry_type: required.inquiryType,
      name: required.name,
      phone: required.phone,
      email: required.email,
      message: required.message,
      accepted_privacy: true,
      source: "website_contact_form",
      submitted_at: new Date().toISOString(),
      _subject: `Contact Inquiry: ${required.inquiryType}`,
    };

    const response = await fetch(CONTACT_FORM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      functions.logger.error("Contact Formspree request failed", {
        status: response.status,
        body: errorBody,
      });
      return res.status(502).json({
        message: "Failed to submit contact request.",
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    functions.logger.error("Contact submission failed", error);
    return res.status(500).json({
      message: "Unable to submit contact request.",
    });
  }
});

exports.apiV2 = functions.https.onRequest(router);
