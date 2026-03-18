// CrossFit Roppongi — Frontend Configuration
// ─────────────────────────────────────────────────────────────
// Google Apps Script Web App URL
// After deploying Code.gs: Deploy → Manage deployments → copy the /exec URL here.
// This URL is not sensitive — it has no secret tokens.
export const GAS_URL = 'https://script.google.com/macros/s/AKfycbx4hH9kvBqLyvGMxKs2IQCFvSJxuXZuwqAzR8UhPP3LJNaWGAVYJPrh1-8cz9IFV0s/exec';

// Square Web Payments SDK — client-safe public credentials (no access token here)
export const SQUARE_APP_ID      = 'sq0idp-eChh4aLkTbdSX1wjBkUjbA';
export const SQUARE_LOCATION_ID = 'LS9F1QVWR4QQ7';
export const SQUARE_ENV         = 'production'; // 'sandbox' | 'production'

// Square SDK CDN URLs
export const SQUARE_SDK_URL = SQUARE_ENV === 'production'
  ? 'https://web.squarecdn.com/v1/square.js'
  : 'https://sandbox.web.squarecdn.com/v1/square.js';
