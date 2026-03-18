// CrossFit Roppongi — Booking API Module
// Wraps all calls to the Google Apps Script Web App backend.
// Imported as an ES module by each booking page.

import { GAS_URL, SQUARE_APP_ID, SQUARE_LOCATION_ID, SQUARE_SDK_URL } from './config.js';

// ─── GAS HTTP helpers ────────────────────────────────────────────────────────

/**
 * GET request to the Apps Script Web App.
 * @param {string} action - endpoint name (e.g. 'getAvailability')
 * @param {Record<string,string>} [params] - additional query params
 * @returns {Promise<any>} parsed JSON response
 */
export async function gasGet(action, params = {}) {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`GAS GET ${action} failed: ${res.status}`);
  const data = await res.json();
  if (data.success === false) throw new Error(data.message || `GAS error (${action})`);
  return data;
}

/**
 * POST request to the Apps Script Web App.
 * @param {string} action - endpoint name (e.g. 'createBooking')
 * @param {object} body - JSON body (action is merged in automatically)
 * @returns {Promise<any>} parsed JSON response
 */
export async function gasPost(action, body = {}) {
  // Use text/plain to avoid CORS preflight — GAS parses the body the same way
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...body }),
  });
  if (!res.ok) throw new Error(`GAS POST ${action} failed: ${res.status}`);
  const data = await res.json();
  if (data.success === false) throw new Error(data.message || `GAS error (${action})`);
  return data;
}

// ─── Availability ────────────────────────────────────────────────────────────

/**
 * Get per-day availability summary for a month calendar.
 * Returns an object keyed by date string 'YYYY-MM-DD' with { available: boolean, slotsLeft: number }.
 *
 * @param {string} classType - e.g. 'trial', 'dropin', 'hyrox_performance', 'hyrox_strength', 'spartan'
 * @param {number} year
 * @param {number} month - 1-indexed
 * @returns {Promise<Record<string, { available: boolean, slotsLeft: number }>>}
 */
export async function getMonthAvailability(classType, year, month) {
  const data = await gasGet('monthAvailability', {
    classType,
    year: String(year),
    month: String(month),
  });
  return data.dates || {};
}

/**
 * Get time slots for a specific date.
 * Returns array of slot objects:
 * { eventId, timeStart, timeEnd, duration, slotsLeft, capacity,
 *   trainer, price, catalogId, langJP, langEN, hasCoach }
 *
 * @param {string} classType
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {Promise<Array>}
 */
export async function getSlots(classType, dateStr) {
  const data = await gasGet('availability', { classType, date: dateStr });
  return data.slots || [];
}

// ─── Customer ────────────────────────────────────────────────────────────────

/**
 * Search for an existing Square customer by email and/or phone.
 * Returns customer data + any active credits for the given class type.
 *
 * @param {{ email?: string, phone?: string, classType?: string }} params
 * @returns {Promise<{ found: boolean, customer?: object, credits?: object }>}
 */
export async function searchCustomer({ email = '', phone = '', classType = '' }) {
  return gasPost('searchCustomer', { email, phone, classType });
}

/**
 * Check active credits for an email + classType.
 * @param {string} email
 * @param {string} classType
 * @returns {Promise<{ found: boolean, credits?: object }>}
 */
export async function checkCredits(email, classType) {
  const data = await gasGet('checkCredits', { email, classType });
  return data;
}

// ─── Booking ─────────────────────────────────────────────────────────────────

/**
 * Create a new booking. All payment processing happens server-side.
 *
 * Payload shape:
 * {
 *   classType,          // 'trial' | 'dropin' | 'opengym' | 'hyrox_performance' | 'hyrox_strength' | 'spartan'
 *   eventId,            // Google Calendar event ID from getSlots
 *   dateStr,            // 'YYYY-MM-DD'
 *   timeStart,          // 'HH:MM'
 *   timeEnd,            // 'HH:MM'
 *   lastName,           // Japanese name order: last first
 *   firstName,
 *   email,
 *   phone,
 *   address,
 *   dob,               // 'YYYY/MM/DD'
 *   gender,            // 'male' | 'female' | 'other'
 *   notes,             // optional
 *   paymentMethod,     // 'card' | 'googlepay' | 'applepay' | 'credit'
 *   squareNonce,       // Square payment token (omit when paymentMethod='credit')
 *   useCredit,         // boolean — use existing Drop In credit instead of paying
 *   creditId,          // CRD-YYYY-NNNNN (required if useCredit=true)
 *   buy3Pack,          // boolean — purchase Drop In 3-Pack (dropin only)
 * }
 *
 * @param {object} payload
 * @returns {Promise<{ bookingId: string, calendarLink: string, price: number, paymentMethod: string }>}
 */
export async function createBooking(payload) {
  return gasPost('createBooking', payload);
}

/**
 * Get upcoming class slots as a chronological list (for HYROX / Spartan pages).
 * Returns up to `limit` slots starting at `offset`, within the next 3 months.
 *
 * @param {string} classType
 * @param {{ limit?: number, offset?: number }} options
 * @returns {Promise<{ slots: Array, hasMore: boolean, total: number }>}
 */
export async function getUpcomingClasses(classType, { limit = 5, offset = 0 } = {}) {
  const data = await gasGet('upcomingClasses', {
    classType,
    limit:  String(limit),
    offset: String(offset),
  });
  return { slots: data.slots || [], hasMore: data.has_more || false, total: data.total || 0 };
}

/**
 * Validate a coupon code for the given class type.
 * Returns { valid, label, discount_amount } on success.
 *
 * @param {string} code
 * @param {string} classType
 * @returns {Promise<{ valid: boolean, label?: string, discount_amount?: number }>}
 */
export async function validateCoupon(code, classType) {
  return gasPost('validateCoupon', { coupon_code: code, class_type: classType });
}

// ─── Square SDK ──────────────────────────────────────────────────────────────

let _squareSdkLoaded = false;

/**
 * Load the Square Web Payments SDK (once) and initialize card, Google Pay, Apple Pay.
 *
 * @param {{ price: number, label?: string }} paymentRequest - amount in JPY
 * @returns {Promise<{
 *   payments: object,
 *   card: object,
 *   googlePay: object|null,
 *   applePay: object|null
 * }>}
 */
export async function initSquare({ price, label = 'Total' }) {
  // Load SDK script once
  if (!_squareSdkLoaded) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SQUARE_SDK_URL;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Square SDK'));
      document.head.appendChild(script);
    });
    _squareSdkLoaded = true;
  }

  if (!window.Square) throw new Error('Square SDK unavailable');

  const payments = window.Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);

  // Credit card
  const card = await payments.card();

  // Shared payment request for digital wallets
  const request = payments.paymentRequest({
    countryCode: 'JP',
    currencyCode: 'JPY',
    total: { amount: String(price), label },
  });

  // Google Pay
  let googlePay = null;
  try {
    googlePay = await payments.googlePay(request);
  } catch (e) {
    console.warn('Google Pay unavailable:', e.message);
  }

  // Apple Pay
  let applePay = null;
  try {
    applePay = await payments.applePay(request);
  } catch (e) {
    if (e.name !== 'PaymentMethodUnsupportedError') {
      console.warn('Apple Pay unavailable:', e.message);
    }
  }

  return { payments, card, googlePay, applePay };
}

/**
 * Tokenize a Square payment method (card, googlePay, or applePay).
 * Throws on failure.
 *
 * @param {'card'|'googlepay'|'applepay'} method
 * @param {{ card?: object, googlePay?: object, applePay?: object }} handles
 * @returns {Promise<string>} payment nonce token
 */
export async function tokenize(method, handles) {
  const target = method === 'card'      ? handles.card
               : method === 'googlepay' ? handles.googlePay
               : method === 'applepay'  ? handles.applePay
               : null;

  if (!target) throw new Error(`Payment method "${method}" is not available`);

  const result = await target.tokenize();
  if (result.status !== 'OK') {
    const msg = result.errors ? result.errors.map(e => e.message).join(', ') : result.status;
    throw new Error(`Payment tokenization failed: ${msg}`);
  }
  return result.token;
}
