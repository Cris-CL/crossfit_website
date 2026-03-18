// CrossFit Roppongi — Apps Script Web App
// Booking backend: Calendar availability, Square payments, Sheets logging, GmailApp emails.
// Square Access Token lives here only — never in frontend.

// ===== CONFIGURATION =====
var CONFIG = {
  SHEETS_ID:             '1pNDApfzNDPUx36DuNScxI0kDIRF1NaEgcUrZi4n8Pac',
  CALENDAR_SCHEDULE:     'c_96a7c8918d366b36d5a653ea46c7bb3478e719c18a158885a2ac243e8887728b@group.calendar.google.com',
  CALENDAR_RESERVATIONS: 'c_8fc3731011a121e80791665e359fb142546cb215d525aae1efd4bce6e4f18817@group.calendar.google.com',
  SQUARE_ACCESS_TOKEN:   'EAAAl98tcIYj7_5oe1886v1g_cOnulHBGvS37wkFrqmQzz-XsApACyKgmFV8iVKR',
  SQUARE_LOCATION_ID:    '8Z8S2HH0WHBKM',
  SQUARE_BASE_URL:       'https://connect.squareup.com/v2',
  SQUARE_VERSION:        '2024-07-17',

  // Square catalog item VARIATION IDs (required by Orders API — not the parent item IDs)
  CATALOG: {
    trial:             'LX5UQFCYHKSYGY4ANB5KTALH',
    dropin:            'X3QFYFK6ZDQBBVD4EK7USLYS',
    opengym:           'X3QFYFK6ZDQBBVD4EK7USLYS', // shares variation with dropin
    dropin_3pack:      '3OLF7TEVUNROCDM77BAWE5K5',
    hyrox_performance: '2D5MRB6QAG4VI2PAI6ATAASW',
    hyrox_strength:    'JR4WFQ2X4CQAOR4O3WQQT5S7',
    spartan:           'TV6ICKD4NG2C4TRK3Y7EYJTF',
  },

  // Default capacity per class type (overridden by calendar event description MAX_CAPACITY)
  CAPACITY: {
    trial:             3,
    dropin:            6,
    opengym:           6,
    hyrox_performance: 15,
    hyrox_strength:    16,
    spartan:           23,
  },

  // Class labels (fallback if LANG_EN not in event description)
  CLASS_NAME_EN: {
    trial:             'Trial Class',
    dropin:            'Drop In',
    opengym:           'Open Gym',
    hyrox_performance: 'HYROX Performance',
    hyrox_strength:    'HYROX Strength',
    spartan:           'Spartan',
  },
  CLASS_NAME_JP: {
    trial:             '体験レッスン',
    dropin:            'ドロップイン',
    opengym:           'オープンジム',
    hyrox_performance: 'ハイロックス・パフォーマンス',
    hyrox_strength:    'HYROXストレングス',
    spartan:           'スパルタントレーニング',
  },

  // Spartan coupon codes — static, distributed to select customers
  // type: 'fixed' (JPY amount off) | 'percent' (percentage off)
  COUPONS: {
    'LEONIDAS': { class_type: 'spartan', type: 'fixed', amount: 1000, label: '¥1,000 OFF' },
  },

  CREDITS_EXPIRY_DAYS:   90,
  ADMIN_PASSWORD:        'gBaN0EP8XBjuA8P',
  TIMEZONE:              'Asia/Tokyo',
  GYM_NAME:              'CrossFit Roppongi',
  GYM_EMAIL:             'bookings@crossfitroppongi.com',
  GYM_ADDRESS_JP:        '〒106-0032 東京都港区六本木７−４−８ ウインドビル B1F\nTEL：03-6438-9813',
  GYM_ADDRESS_EN:        '〒106-0032 Tokyo, Minato-ku, Roppongi 7-4-8 Wind Building B1F, Japan\nTEL：03-6438-9813',
  GYM_LOCATION:          '〒106-0032 東京都港区六本木７−４−８ ウインドビル B1F',
  STAFF_EMAILS:          'alvaroaltamirano@crossfitroppongi.com, tsujimoto@crossfitroppongi.com, bruce@crossfitroppongi.com, bookings@crossfitroppongi.com, sato@crossfitroppongi.com',
};

// ===== RESPONSE HELPERS =====
function _json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function _ok(data)  { return _json(Object.assign({ success: true }, data || {})); }
function _err(msg)  { return _json({ success: false, message: msg }); }

// ===== ROUTER =====
function doGet(e) {
  try {
    var action = e.parameter.action;
    if (action === 'availability')       return _getAvailability(e.parameter);
    if (action === 'monthAvailability')  return _getMonthAvailability(e.parameter);
    if (action === 'checkCredits')       return _getCheckCredits(e.parameter);
    if (action === 'upcomingClasses')    return _getUpcomingClasses(e.parameter);
    return _err('Unknown GET action: ' + action);
  } catch (ex) {
    console.error('doGet error', ex);
    return _err(ex.message || 'Server error');
  }
}

function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action;
    if (action === 'searchCustomer')     return _postSearchCustomer(body);
    if (action === 'createBooking')      return _postCreateBooking(body);
    if (action === 'validateCoupon')     return _postValidateCoupon(body);
    if (action === 'useCreditFrontDesk') return _postUseCreditFrontDesk(body);
    if (action === 'submitContactForm')  return _postSubmitContactForm(body);
    if (action === 'submitCareerForm')   return _postSubmitCareerForm(body);
    return _err('Unknown POST action: ' + action);
  } catch (ex) {
    console.error('doPost error', ex);
    return _err(ex.message || 'Server error');
  }
}

// ===== GET: AVAILABILITY =====
// ?action=availability&date=YYYY-MM-DD&classType=dropin
function _getAvailability(params) {
  var date      = params.date;
  var classType = (params.classType || '').toLowerCase();
  if (!date) return _err('date parameter required (YYYY-MM-DD)');

  var parts = date.split('-').map(Number);
  var start = new Date(parts[0], parts[1] - 1, parts[2], 0,  0,  0);
  var end   = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);

  var scheduleCal    = CalendarApp.getCalendarById(CONFIG.CALENDAR_SCHEDULE);
  var reservationCal = CalendarApp.getCalendarById(CONFIG.CALENDAR_RESERVATIONS);
  var classEvents    = scheduleCal.getEvents(start, end);

  var slots = [];
  classEvents.forEach(function(event) {
    var desc        = _parseEventDescription(event.getDescription());
    var evClassType = (desc['CLASS_TYPE'] || '').toLowerCase();

    // Filter by classType if provided
    if (classType && evClassType !== classType) return;

    var slotStart = event.getStartTime();
    var slotEnd   = event.getEndTime();
    var capacity  = parseInt(desc['MAX_CAPACITY'], 10) || CONFIG.CAPACITY[evClassType] || 6;

    // Count confirmed reservations for this exact slot
    var reservations = reservationCal.getEvents(slotStart, new Date(slotEnd.getTime() + 1)).filter(function(r) {
      return Math.abs(r.getStartTime().getTime() - slotStart.getTime()) < 60000;
    });
    var booked    = reservations.length;
    var available = Math.max(0, capacity - booked);
    var duration  = parseInt(desc['DURATION'], 10) || 60;
    var hasCoach  = desc['HAS_COACH'] !== 'false';

    slots.push({
      event_id:          event.getId(),
      class_type:        evClassType,
      class_name_en:     desc['LANG_EN']    || CONFIG.CLASS_NAME_EN[evClassType] || event.getTitle(),
      class_name_jp:     desc['LANG_JP']    || CONFIG.CLASS_NAME_JP[evClassType] || event.getTitle(),
      trainer:           desc['TRAINER']    || '',
      has_coach:         hasCoach,
      time_start:        Utilities.formatDate(slotStart, CONFIG.TIMEZONE, 'HH:mm'),
      time_end:          Utilities.formatDate(slotEnd,   CONFIG.TIMEZONE, 'HH:mm'),
      start_iso:         Utilities.formatDate(slotStart, CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss"),
      end_iso:           Utilities.formatDate(slotEnd,   CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss"),
      duration:          duration,
      capacity:          capacity,
      booked:            booked,
      available:         available,
      catalog_object_id: desc['CATALOG_ID'] || CONFIG.CATALOG[evClassType] || '',
      price:             parseInt(desc['PRICE'], 10) || 0,
    });
  });

  // Sort by start time
  slots.sort(function(a, b) { return a.time_start.localeCompare(b.time_start); });

  return _ok({ date: date, class_type: classType, slots: slots });
}

// ===== GET: MONTH AVAILABILITY =====
// ?action=monthAvailability&year=2026&month=3&classType=dropin
function _getMonthAvailability(params) {
  var year      = parseInt(params.year,  10);
  var month     = parseInt(params.month, 10); // 1-based
  var classType = (params.classType || '').toLowerCase();
  if (!year || !month) return _err('year and month parameters required');

  var start = new Date(year, month - 1, 1,  0,  0,  0);
  var end   = new Date(year, month,     0, 23, 59, 59); // last day of month

  var scheduleCal    = CalendarApp.getCalendarById(CONFIG.CALENDAR_SCHEDULE);
  var reservationCal = CalendarApp.getCalendarById(CONFIG.CALENDAR_RESERVATIONS);
  var events         = scheduleCal.getEvents(start, end);

  var dateMap = {};
  events.forEach(function(ev) {
    var desc        = _parseEventDescription(ev.getDescription());
    var evClassType = (desc['CLASS_TYPE'] || '').toLowerCase();
    if (classType && evClassType !== classType) return;

    var slotStart = ev.getStartTime();
    var slotEnd   = ev.getEndTime();
    var capacity  = parseInt(desc['MAX_CAPACITY'], 10) || CONFIG.CAPACITY[evClassType] || 6;

    var reservations = reservationCal.getEvents(slotStart, new Date(slotEnd.getTime() + 1)).filter(function(r) {
      return Math.abs(r.getStartTime().getTime() - slotStart.getTime()) < 60000;
    });
    var available = Math.max(0, capacity - reservations.length);

    var d = Utilities.formatDate(slotStart, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    if (!dateMap[d]) dateMap[d] = { has_availability: false, slots: 0 };
    if (available > 0) {
      dateMap[d].has_availability = true;
      dateMap[d].slots += available;
    }
  });

  return _ok({ year: year, month: month, class_type: classType, dates: dateMap });
}

// ===== GET: UPCOMING CLASSES (list view for HYROX / Spartan) =====
// ?action=upcomingClasses&classType=spartan[&limit=5&offset=0]
function _getUpcomingClasses(params) {
  var classType = (params.classType || '').toLowerCase();
  var limit     = Math.min(parseInt(params.limit  || '5',  10), 20);
  var offset    = Math.max(parseInt(params.offset || '0',  10), 0);
  if (!classType) return _err('classType required');

  var now     = new Date();
  var toDate  = new Date(now);
  toDate.setDate(toDate.getDate() + 90); // 3 months ahead

  var scheduleCal    = CalendarApp.getCalendarById(CONFIG.CALENDAR_SCHEDULE);
  var reservationCal = CalendarApp.getCalendarById(CONFIG.CALENDAR_RESERVATIONS);
  var events         = scheduleCal.getEvents(now, toDate);

  var slots = [];
  events.forEach(function(ev) {
    var desc        = _parseEventDescription(ev.getDescription());
    var evClassType = (desc['CLASS_TYPE'] || '').toLowerCase();
    if (evClassType !== classType) return;

    var slotStart = ev.getStartTime();
    var slotEnd   = ev.getEndTime();
    var capacity  = parseInt(desc['MAX_CAPACITY'], 10) || CONFIG.CAPACITY[evClassType] || 6;

    var reservations = reservationCal.getEvents(slotStart, new Date(slotEnd.getTime() + 1)).filter(function(r) {
      return Math.abs(r.getStartTime().getTime() - slotStart.getTime()) < 60000;
    });
    var booked    = reservations.length;
    var available = Math.max(0, capacity - booked);
    var duration  = parseInt(desc['DURATION'], 10) || 60;
    var dayNames  = ['日', '月', '火', '水', '木', '金', '土'];

    slots.push({
      event_id:          ev.getId(),
      date:              Utilities.formatDate(slotStart, CONFIG.TIMEZONE, 'yyyy-MM-dd'),
      day_of_week:       dayNames[slotStart.getDay()],
      time_start:        Utilities.formatDate(slotStart, CONFIG.TIMEZONE, 'HH:mm'),
      time_end:          Utilities.formatDate(slotEnd,   CONFIG.TIMEZONE, 'HH:mm'),
      duration:          duration,
      trainer:           desc['TRAINER']    || '',
      capacity:          capacity,
      booked:            booked,
      available:         available,
      class_type:        evClassType,
      class_name_en:     desc['LANG_EN']    || CONFIG.CLASS_NAME_EN[evClassType] || '',
      class_name_jp:     desc['LANG_JP']    || CONFIG.CLASS_NAME_JP[evClassType] || '',
      catalog_object_id: desc['CATALOG_ID'] || CONFIG.CATALOG[evClassType]       || '',
      price:             parseInt(desc['PRICE'], 10) || 0,
    });
  });

  // Sort chronologically
  slots.sort(function(a, b) {
    return a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start);
  });

  var paged   = slots.slice(offset, offset + limit);
  var hasMore = (offset + limit) < slots.length;

  return _ok({ slots: paged, total: slots.length, has_more: hasMore, offset: offset, limit: limit });
}

// ===== GET: CHECK CREDITS =====
// ?action=checkCredits&email=xxx@example.com[&classType=dropin]
function _getCheckCredits(params) {
  var email     = (params.email     || '').trim().toLowerCase();
  var classType = (params.classType || '').toLowerCase();
  if (!email) return _err('email parameter required');
  return _ok(_checkCreditsData(email, classType));
}

// ===== POST: SEARCH SQUARE CUSTOMER =====
function _postSearchCustomer(body) {
  var email = (body.email || '').trim();
  var phone = (body.phone || '').trim();
  if (!email && !phone) return _err('email or phone required');

  var filter = email
    ? { email_address: { exact: email } }
    : { phone_number:  { exact: phone } };

  var result = _squareRequest('POST', '/customers/search', { query: { filter: filter } });
  if (result.errors) return _err(result.errors[0].detail || 'Square API error');

  var customers = result.customers || [];
  if (customers.length === 0) return _ok({ found: false });

  var c          = customers[0];
  var creditEmail = c.email_address || email;
  var creditData  = _checkCreditsData(creditEmail.toLowerCase(), '');

  return _ok({
    found: true,
    customer: {
      id:            c.id,
      given_name:    c.given_name    || '',
      family_name:   c.family_name   || '',
      email_address: c.email_address || '',
      phone_number:  c.phone_number  || '',
      birthday:      c.birthday      || '',
      address:       c.address       || null,
    },
    has_credits:       creditData.has_credits,
    credits_remaining: creditData.credits_remaining || 0,
    credit_id:         creditData.credit_id         || null,
    expires_at:        creditData.expires_at         || null,
    pack_name_jp:      creditData.pack_name_jp       || null,
    pack_name_en:      creditData.pack_name_en       || null,
  });
}

// ===== POST: VALIDATE COUPON =====
function _postValidateCoupon(body) {
  var code      = (body.coupon_code || '').trim().toUpperCase();
  var classType = (body.class_type  || '').toLowerCase();
  if (!code) return _err('coupon_code required');

  var coupon = CONFIG.COUPONS[code];
  if (!coupon) return _ok({ valid: false });
  if (coupon.class_type && coupon.class_type !== classType) return _ok({ valid: false });

  // Price map for calculating fixed discount amount on percent coupons
  var priceMap = { trial: 3300, dropin: 4950, opengym: 4950, hyrox_performance: 4950, hyrox_strength: 4950, spartan: 4400 };
  var basePrice = priceMap[classType] || 0;
  var discountAmount = coupon.type === 'percent'
    ? Math.round(basePrice * coupon.amount / 100)
    : coupon.amount;

  return _ok({
    valid:           true,
    label:           coupon.label,
    type:            coupon.type,
    amount:          coupon.amount,
    discount_amount: discountAmount,
  });
}

// ===== POST: CREATE BOOKING =====
function _postCreateBooking(body) {
  // ── required fields ──
  var class_type    = body.class_type    || '';
  var event_id      = body.event_id      || '';
  var class_date    = body.class_date    || ''; // YYYY-MM-DD
  var class_time_start = body.class_time_start || '';
  var class_time_end   = body.class_time_end   || '';
  var customer_first   = body.customer_first   || '';
  var customer_last    = body.customer_last    || '';
  var email         = (body.email        || '').trim();
  var phone         = (body.phone        || '').trim();
  var dob           = body.dob           || '';
  var gender        = body.gender        || '';

  // ── optional fields ──
  var address       = body.address       || '';
  var notes         = body.notes         || '';
  var class_name_en = body.class_name_en || CONFIG.CLASS_NAME_EN[class_type] || class_type;
  var class_name_jp = body.class_name_jp || CONFIG.CLASS_NAME_JP[class_type] || class_type;
  var trainer       = body.trainer       || '';
  var catalog_obj   = body.catalog_object_id || CONFIG.CATALOG[class_type] || '';
  var duration      = body.duration      || 60;
  var price         = body.price         || 0;

  // ── payment fields ──
  var pack          = body.pack          || 'single'; // 'single' | 'dropin_3pack'
  var use_credit    = body.use_credit    === true;
  var credit_id     = body.credit_id     || '';
  var sourceId      = body.sourceId      || '';
  var verToken      = body.verificationToken || '';
  var coupon_code   = (body.coupon_code  || '').trim().toUpperCase();

  // ── coupon discount ──
  var couponDiscount = 0;
  var couponLabel    = '';
  if (coupon_code && CONFIG.COUPONS[coupon_code]) {
    var cpn = CONFIG.COUPONS[coupon_code];
    if (!cpn.class_type || cpn.class_type === class_type) {
      couponDiscount = cpn.type === 'percent'
        ? Math.round(price * cpn.amount / 100)
        : cpn.amount;
      couponLabel = cpn.label;
    }
  }

  if (!class_type)       return _err('class_type is required.');
  if (!class_date)       return _err('class_date is required.');
  if (!class_time_start) return _err('class_time_start is required.');
  if (!email)            return _err('Email is required.');
  if (!dob)              return _err('Date of birth is required.');
  if (!gender)           return _err('Gender is required.');
  if (!use_credit && !sourceId) return _err('Payment token (sourceId) is required.');

  // ── 1. Create or retrieve Square Customer ──
  var squareCustomerId = _squareUpsertCustomer({
    given_name:    customer_first,
    family_name:   customer_last,
    email_address: email,
    phone_number:  phone,
    address:       address,
    birthday:      dob,
  });

  // ── 2. Payment or credit ──
  var squareOrderId   = null;
  var squarePaymentId = null;
  var paymentMethod   = 'credit';
  var usedCreditId    = '';
  var newCreditId     = '';

  if (use_credit) {
    // Deduct one session from existing credit
    var deductResult = _deductCredit(credit_id || email, 'website');
    if (!deductResult.success) return _err(deductResult.message);
    usedCreditId = deductResult.credit_id;
    paymentMethod = 'credit';

  } else if (pack === 'dropin_3pack') {
    // Purchase 3-pack: pay dropin_3pack catalog item, create credit row, use 1 session today
    var packCatalogId = CONFIG.CATALOG['dropin_3pack'];
    if (!packCatalogId) return _err('3-pack catalog item not configured.');

    var orderRes = _squareRequest('POST', '/orders', {
      idempotency_key: _uuid(),
      order: {
        location_id: CONFIG.SQUARE_LOCATION_ID,
        customer_id: squareCustomerId || undefined,
        line_items:  [{ catalog_object_id: packCatalogId, quantity: '1' }],
        metadata:    { class_type: class_type, class_date: class_date, source: 'website' },
      },
    });
    if (orderRes.errors) return _err(orderRes.errors[0].detail || 'Order creation failed.');
    squareOrderId = orderRes.order.id;

    var packPayBody = {
      source_id:       sourceId,
      idempotency_key: _uuid(),
      amount_money:    orderRes.order.total_money,
      order_id:        squareOrderId,
      location_id:     CONFIG.SQUARE_LOCATION_ID,
      customer_id:     squareCustomerId || undefined,
      note:            'Drop In 3-Pack — ' + customer_last + ' ' + customer_first,
    };
    if (verToken) packPayBody.verification_token = verToken;

    var packPayRes = _squareRequest('POST', '/payments', packPayBody);
    if (packPayRes.errors) return _err(packPayRes.errors[0].detail || 'Payment failed.');
    squarePaymentId = packPayRes.payment.id;
    paymentMethod   = 'dropin_3pack';

    // Create CFR Credits row (3 sessions, use 1 today → 2 remaining)
    newCreditId = _createCFRCredit({
      square_customer_id: squareCustomerId || '',
      customer_email:     email,
      customer_name:      customer_last + ' ' + customer_first,
      class_type:         'dropin_3pack',
      source_order_id:    squareOrderId,
      sessions_purchased: 3,
      sessions_used:      1,
      sessions_remaining: 2,
    });
    usedCreditId = newCreditId;

  } else {
    // Single session payment
    if (!catalog_obj) return _err('catalog_object_id is required for payment.');

    var singleOrderBody = {
      location_id: CONFIG.SQUARE_LOCATION_ID,
      customer_id: squareCustomerId || undefined,
      line_items:  [{ catalog_object_id: catalog_obj, quantity: '1' }],
      metadata:    Object.assign({ class_type: class_type, class_date: class_date, source: 'website' }, coupon_code ? { coupon: coupon_code } : {}),
    };
    if (couponDiscount > 0) {
      singleOrderBody.discounts = [{
        name:         couponLabel || 'Coupon Discount',
        amount_money: { amount: couponDiscount, currency: 'JPY' },
        scope:        'ORDER',
      }];
    }
    var singleOrderRes = _squareRequest('POST', '/orders', {
      idempotency_key: _uuid(),
      order: singleOrderBody,
    });
    if (singleOrderRes.errors) {
      var oe = singleOrderRes.errors[0];
      return _err('[Order] ' + (oe.field ? oe.field + ': ' : '') + (oe.detail || 'Order creation failed.'));
    }
    squareOrderId = singleOrderRes.order.id;
    var totalMoney = singleOrderRes.order.total_money || { amount: price, currency: 'JPY' };

    var singlePayBody = {
      source_id:       sourceId,
      idempotency_key: _uuid(),
      amount_money:    totalMoney,
      order_id:        squareOrderId,
      location_id:     CONFIG.SQUARE_LOCATION_ID,
      customer_id:     squareCustomerId || undefined,
      note:            class_name_en + ' ' + class_date + ' ' + class_time_start + ' — ' + customer_last + ' ' + customer_first,
    };
    if (verToken) singlePayBody.verification_token = verToken;

    var singlePayRes = _squareRequest('POST', '/payments', singlePayBody);
    if (singlePayRes.errors) {
      var pe = singlePayRes.errors[0];
      return _err('[Payment] ' + (pe.field ? pe.field + ': ' : '') + (pe.detail || 'Payment failed.'));
    }
    squarePaymentId = singlePayRes.payment.id;
    paymentMethod   = 'square_payment';
  }

  // ── 3. Generate booking ID ──
  var bookingId = _generateBookingId();

  // ── 4. Add Calendar 2 reservation event ──
  _addReservationEvent({
    booking_id:   bookingId,
    class_name_en: class_name_en,
    customer_last: customer_last,
    customer_first: customer_first,
    email:         email,
    phone:         phone,
    class_date:    class_date,
    class_time_start: class_time_start,
    class_time_end:   class_time_end,
    class_type:    class_type,
    duration:      duration,
  });

  // ── 5. Build Google Calendar quick-add link ──
  var calLink = _calendarAddLink(class_name_en, class_date, class_time_start, class_time_end);

  // ── 6. Log to CFR Bookings ──
  _logBooking({
    booking_id:         bookingId,
    class_type:         class_type,
    class_name_en:      class_name_en,
    class_name_jp:      class_name_jp,
    trainer:            trainer,
    class_date:         class_date,
    class_time_start:   class_time_start,
    class_time_end:     class_time_end,
    duration:           duration,
    calendar_event_id:  event_id,
    customer_last:      customer_last,
    customer_first:     customer_first,
    customer_email:     email,
    customer_phone:     phone,
    customer_address:   address,
    customer_dob:       dob,
    customer_gender:    gender,
    square_customer_id: squareCustomerId || '',
    square_order_id:    squareOrderId    || '',
    square_payment_id:  squarePaymentId  || '',
    catalog_object_id:  catalog_obj,
    price:              price,
    payment_method:     paymentMethod,
    used_credit:        use_credit || pack === 'dropin_3pack',
    credit_id:          usedCreditId,
    source:             'website',
    status:             'confirmed',
    calendar_link:      calLink,
    notes:              notes,
  });

  // ── 7. Send emails ──
  _sendBookingAdminNotification({
    bookingId: bookingId, class_name_en: class_name_en, class_name_jp: class_name_jp,
    class_date: class_date, class_time_start: class_time_start, trainer: trainer,
    customer_last: customer_last, customer_first: customer_first,
    email: email, phone: phone, dob: dob, gender: gender, address: address,
    paymentMethod: paymentMethod, squareOrderId: squareOrderId, notes: notes,
    pack: pack, usedCreditId: usedCreditId,
  });

  if (email) {
    _sendBookingConfirmation({
      bookingId: bookingId, class_name_en: class_name_en, class_name_jp: class_name_jp,
      class_date: class_date, class_time_start: class_time_start, class_time_end: class_time_end,
      duration: duration, trainer: trainer,
      customer_last: customer_last, customer_first: customer_first,
      email: email, phone: phone, paymentMethod: paymentMethod,
      price: price, calLink: calLink,
      pack: pack, newCreditId: newCreditId,
      has_coach: body.has_coach !== false,
    });
  }

  return _ok({
    booking_id:        bookingId,
    calendar_link:     calLink,
    credits_remaining: newCreditId ? 2 : undefined,
  });
}

// ===== POST: USE CREDIT — FRONT DESK =====
function _postUseCreditFrontDesk(body) {
  if (body.adminPassword !== CONFIG.ADMIN_PASSWORD) return _err('Unauthorized.');

  var email      = (body.email      || '').trim();
  var credit_id  = body.credit_id   || '';
  var class_type = body.class_type  || 'dropin';
  var class_date = body.class_date  || '';
  var class_time_start = body.class_time_start || '';
  var customer_name    = body.customer_name    || email;

  if (!email)     return _err('Customer email required.');
  if (!class_date) return _err('Class date required.');

  var deductResult = _deductCredit(credit_id || email, 'front_desk');
  if (!deductResult.success) return _err(deductResult.message);

  var bookingId = _generateBookingId();

  _logBooking({
    booking_id:         bookingId,
    class_type:         class_type,
    class_name_en:      CONFIG.CLASS_NAME_EN[class_type] || class_type,
    class_name_jp:      CONFIG.CLASS_NAME_JP[class_type] || class_type,
    trainer:            '',
    class_date:         class_date,
    class_time_start:   class_time_start,
    class_time_end:     '',
    duration:           60,
    calendar_event_id:  '',
    customer_last:      customer_name,
    customer_first:     '',
    customer_email:     email,
    customer_phone:     '',
    customer_address:   '',
    customer_dob:       '',
    customer_gender:    '',
    square_customer_id: '',
    square_order_id:    '',
    square_payment_id:  '',
    catalog_object_id:  CONFIG.CATALOG[class_type] || '',
    price:              0,
    payment_method:     'credit',
    used_credit:        true,
    credit_id:          deductResult.credit_id,
    source:             'front_desk',
    status:             'confirmed',
    calendar_link:      '',
    notes:              'Front desk credit redemption',
  });

  _emailAdmin(
    '[Front Desk] Credit used — ' + customer_name + ' (' + (CONFIG.CLASS_NAME_EN[class_type] || class_type) + ' ' + class_date + ')',
    'Front desk credit redemption.\n\n' +
    'Booking ID : ' + bookingId + '\n' +
    'Customer   : ' + customer_name + ' <' + email + '>\n' +
    'Class      : ' + (CONFIG.CLASS_NAME_EN[class_type] || class_type) + ' ' + class_date + ' ' + class_time_start + '\n' +
    'Credits remaining after use: ' + deductResult.credits_remaining
  );

  return _ok({
    booking_id:        bookingId,
    credits_remaining: deductResult.credits_remaining,
  });
}

// ===== POST: CONTACT FORM =====
function _postSubmitContactForm(body) {
  var inquiryType    = body.inquiryType      || '';
  var name           = body.name             || '';
  var phone          = body.phone            || '';
  var email          = body.email            || '';
  var message        = body.message          || '';
  var acceptedPrivacy= body.acceptedPrivacy;
  var website        = body.website          || '';

  if (website) return _ok({});  // honeypot

  if (!inquiryType || !name || !phone || !email || !message) {
    return _err('Required fields are missing.');
  }
  if (!acceptedPrivacy) return _err('Privacy policy consent is required.');

  _logContactForm({ inquiryType: inquiryType, name: name, phone: phone, email: email, message: message });

  var div    = ' – – – – – – – ENGLISH – – – – – – –';
  var addr   = CONFIG.GYM_ADDRESS_JP + '\nこのメールは CrossFit Roppongi (crossfitroppongi.com) のお問い合わせフォームから送信されました';
  var addrEn = CONFIG.GYM_ADDRESS_EN + '\nThis email was sent from the inquiry form of CrossFit Roppongi (crossfitroppongi.com)';

  var adminBody =
    '※このメールはシステムから自動で送信されています。\n\n' +
    name + '様よりお問い合わせがありました。\n\n' +
    'お問い合わせ内容 ： ' + inquiryType + '\n' +
    '氏名 ： ' + name + '様\n' +
    '電話番号 : ' + phone + '\n' +
    'メールアドレス : ' + email + '\n' +
    'お問い合わせ詳細: ' + message + '\n\n' +
    'CrossFit Roppongi\n' + addr + '\n\n' +
    div + '\n\n' +
    '※This email has been sent automatically by the system.\n\n' +
    'An inquiry has been received from ' + name + '.\n\n' +
    'Inquiry Type: ' + inquiryType + '\n' +
    'Name: ' + name + '\n' +
    'Phone Number: ' + phone + '\n' +
    'Email Address: ' + email + '\n' +
    'Inquiry Details: ' + message + '\n\n' +
    'CrossFit Roppongi\n' + addrEn;

  GmailApp.sendEmail(
    CONFIG.STAFF_EMAILS,
    'CrossFit Roppongi | ' + inquiryType + ' | ' + name,
    adminBody,
    { name: CONFIG.GYM_NAME + ' Website', replyTo: email }
  );

  var customerBody =
    '※このメールはシステムから自動で送信されています。\n\n' +
    name + ' 様\n\n' +
    'このたびはお問い合わせ頂き誠にありがとうございました。\n' +
    '改めて担当者よりご連絡をさせていただきます。\n\n' +
    'なお、お問い合わせから一週間経っても連絡がない場合は、\n' +
    'お問い合わせ内容を受信できていない可能性がございます。\n' +
    '大変お手数ですが、本メールへご返信くださいますようお願いいたします。\n\n' +
    'ご送信内容の確認\n\n' +
    'お問い合わせ内容 ： ' + inquiryType + '\n' +
    '氏名 ： ' + name + '様\n' +
    '電話番号 : ' + phone + '\n' +
    'メールアドレス : ' + email + '\n' +
    'お問い合わせ詳細: ' + message + '\n\n' +
    'このメールにお心当たりがない場合、または誤って受信された場合は、お手数ですがご連絡ください。\n' +
    'このたびはお問い合わせ重ねてお礼申し上げます。\n\n' +
    'CrossFit Roppongi\n' + addr + '\n\n' +
    div + '\n\n' +
    '※This email has been sent automatically by the system.\n\n' +
    'Dear ' + name + ',\n\n' +
    'Thank you very much for contacting us.\n' +
    'A representative will review your inquiry and get back to you shortly.\n\n' +
    'If you do not receive a response within one week, it is possible that we did not successfully receive your message.\n' +
    'We apologize for the inconvenience. Please reply to this email and we will forward your message to the appropriate team.\n\n' +
    'Confirmation of your submitted information\n\n' +
    'Inquiry Type: ' + inquiryType + '\n' +
    'Name: ' + name + '\n' +
    'Phone Number: ' + phone + '\n' +
    'Email Address: ' + email + '\n' +
    'Inquiry Details: ' + message + '\n\n' +
    'If you received this email by mistake or do not recognize this inquiry, please contact us.\n' +
    'Thank you again for your inquiry.\n\n' +
    'CrossFit Roppongi\n' + addrEn;

  _emailCustomer(
    email,
    'CrossFit Roppongi | お問い合わせを受け付けました。(Your inquiry has been received)',
    customerBody
  );

  return _ok({});
}

// ===== POST: CAREER FORM =====
function _postSubmitCareerForm(body) {
  var name       = body.name       || '';
  var email      = body.email      || '';
  var phone      = body.phone      || '';
  var position   = body.position   || '';
  var birthday   = body.birthday   || '';
  var gender     = body.gender     || '';
  var message    = body.message    || '';
  var fileBase64 = body.fileBase64 || '';
  var fileName   = body.fileName   || '';
  var website    = body.website    || '';

  if (website) return _ok({});  // honeypot
  if (!name || !email) return _err('Required fields are missing.');

  // Save file to Drive
  var driveUrl = '';
  if (fileBase64 && fileName) {
    try {
      var folder  = _getOrCreateDriveFolder('CFR_Career_Applications');
      var decoded = Utilities.base64Decode(fileBase64);
      var blob    = Utilities.newBlob(decoded, 'application/octet-stream', fileName);
      driveUrl    = folder.createFile(blob).getUrl();
    } catch (ex) {
      console.error('Resume upload failed', ex);
    }
  }

  _logCareerForm({ name: name, email: email, phone: phone, position: position, birthday: birthday, gender: gender, fileName: fileName, driveUrl: driveUrl, message: message });

  var div    = ' – – – – – – – ENGLISH – – – – – – –';
  var addr   = CONFIG.GYM_ADDRESS_JP + '\nこのメールは CrossFit Roppongi (crossfitroppongi.com) のお問い合わせフォームから送信されました';
  var addrEn = CONFIG.GYM_ADDRESS_EN + '\nThis email was sent from the inquiry form of CrossFit Roppongi (crossfitroppongi.com)';
  var fileRef = driveUrl ? driveUrl : (fileName || '—');

  var adminBody =
    '※このメールはシステムから自動で送信されています。\n\n' +
    name + '様よりご応募がありました。\n\n' +
    '職種 ： ' + (position || '—') + '\n' +
    '氏名 ： ' + name + '様\n' +
    '生年月日 : ' + (birthday || '—') + '\n' +
    '性別 : ' + (gender || '—') + '\n' +
    '電話番号 : ' + (phone || '—') + '\n' +
    'メール : ' + email + '\n' +
    'ファイルを添付する : ' + fileRef + '\n' +
    'ご希望・ご質問: ' + (message || '—') + '\n\n' +
    'CrossFit Roppongi\n' + addr + '\n\n' +
    div + '\n\n' +
    '※This email has been sent automatically by the system.\n\n' +
    'An application has been received from ' + name + '.\n\n' +
    'Position Applied For: ' + (position || '—') + '\n' +
    'Name: ' + name + '\n' +
    'Date of Birth: ' + (birthday || '—') + '\n' +
    'Gender: ' + (gender || '—') + '\n' +
    'Phone Number: ' + (phone || '—') + '\n' +
    'Email: ' + email + '\n' +
    'Attachment: ' + fileRef + '\n' +
    'Requests / Questions: ' + (message || '—') + '\n\n' +
    'CrossFit Roppongi\n' + addrEn;

  _emailAdmin(
    'CrossFit Roppongi | ' + (position || 'General') + ' | ' + name,
    adminBody
  );

  var customerBody =
    '※このメールはシステムから自動で送信されています。\n\n' +
    name + ' 様\n\n' +
    'この度は' + (position || 'ご応募') + 'へご応募頂き誠にありがとうございました。\n' +
    '改めて担当者よりご連絡をさせていただきます。\n\n' +
    'なお、お問い合わせから一週間経っても連絡がない場合は、\n' +
    'お問い合わせ内容を受信できていない可能性がございます。\n\n' +
    '大変お手数をおかけいたしますが、本メールにご返信いただき、\n' +
    '再度お問い合わせくださいますようお願いいたします。\n\n' +
    'ご送信内容の確認\n\n' +
    '職種 ： ' + (position || '—') + '\n' +
    '氏名 ： ' + name + '様\n' +
    '生年月日 : ' + (birthday || '—') + '\n' +
    '性別 : ' + (gender || '—') + '\n' +
    '電話番号 : ' + (phone || '—') + '\n' +
    'メール : ' + email + '\n' +
    'ご希望・ご質問: ' + (message || '—') + '\n\n' +
    'このメールにお心当たりがない場合、または誤って受信された場合は、お手数ですがご連絡ください。\n' +
    'この度はお問い合わせ重ねてお礼申し上げます。\n\n' +
    'CrossFit Roppongi\n' + addr + '\n\n' +
    div + '\n\n' +
    '※This email has been sent automatically by the system.\n\n' +
    'Dear ' + name + ',\n\n' +
    'Thank you very much for applying for ' + (position || 'the position') + '.\n' +
    'A representative will contact you shortly.\n\n' +
    'If you do not receive a response within one week of your application,\n' +
    'it is possible that we did not successfully receive your submission.\n' +
    'We apologize for the inconvenience and ask that you please contact us again by replying to this email.\n\n' +
    'Confirmation of your submitted information\n\n' +
    'Position Applied For: ' + (position || '—') + '\n' +
    'Name: ' + name + '\n' +
    'Date of Birth: ' + (birthday || '—') + '\n' +
    'Gender: ' + (gender || '—') + '\n' +
    'Phone Number: ' + (phone || '—') + '\n' +
    'Email: ' + email + '\n' +
    'Requests / Questions: ' + (message || '—') + '\n\n' +
    'If you received this email by mistake or do not recognize this inquiry, please contact us.\n' +
    'Thank you again for your application.\n\n' +
    'CrossFit Roppongi\n' + addrEn;

  _emailCustomer(
    email,
    'CrossFit Roppongi | ご応募ありがとうございます。(Thank you for your application)',
    customerBody
  );

  return _ok({});
}

// ===== BOOKING HELPERS =====

// Parse Google Calendar event description into key-value map
function _parseEventDescription(description) {
  var result = {};
  if (!description) return result;
  description.split('\n').forEach(function(line) {
    var idx = line.indexOf(':');
    if (idx < 0) return;
    var key = line.substring(0, idx).trim().toUpperCase();
    var val = line.substring(idx + 1).trim();
    if (key) result[key] = val;
  });
  return result;
}

// Generate sequential booking ID: CFR-YYYY-NNNNN
function _generateBookingId() {
  var year  = new Date().getFullYear();
  var sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Bookings');
  var last  = sheet.getLastRow();
  var maxSeq = 0;
  if (last > 1) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    ids.forEach(function(row) {
      var m = String(row[0]).match(/CFR-\d{4}-(\d+)/);
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
    });
  }
  return 'CFR-' + year + '-' + String(maxSeq + 1).padStart(5, '0');
}

// Generate sequential credit ID: CRD-YYYY-NNNNN
function _generateCreditId() {
  var year  = new Date().getFullYear();
  var sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Credits');
  var last  = sheet.getLastRow();
  var maxSeq = 0;
  if (last > 1) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    ids.forEach(function(row) {
      var m = String(row[0]).match(/CRD-\d{4}-(\d+)/);
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
    });
  }
  return 'CRD-' + year + '-' + String(maxSeq + 1).padStart(5, '0');
}

// Create or retrieve Square Customer — returns customer ID string (or null on error)
function _squareUpsertCustomer(data) {
  if (!data.email_address) return null;
  try {
    var searchRes = _squareRequest('POST', '/customers/search', {
      query: { filter: { email_address: { exact: data.email_address } } },
    });
    if (!searchRes.errors && searchRes.customers && searchRes.customers.length > 0) {
      return searchRes.customers[0].id;
    }
    var createRes = _squareRequest('POST', '/customers', {
      idempotency_key: _uuid(),
      given_name:      data.given_name    || '',
      family_name:     data.family_name   || '',
      email_address:   data.email_address,
      phone_number:    data.phone_number  || undefined,
      birthday:        data.birthday      || undefined,
      note:            'Created via website booking',
    });
    if (createRes.errors) {
      console.error('Square create customer error', createRes.errors[0].detail);
      return null;
    }
    return createRes.customer.id;
  } catch (ex) {
    console.error('_squareUpsertCustomer error', ex);
    return null;
  }
}

// Create a new CFR Credits row — returns credit_id
function _createCFRCredit(d) {
  var creditId  = _generateCreditId();
  var now       = new Date();
  var expiresAt = new Date(now.getTime() + CONFIG.CREDITS_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Credits').appendRow([
    creditId,                     // credit_id
    d.square_customer_id || '',   // square_customer_id
    d.customer_email,             // customer_email
    d.customer_name || '',        // customer_name
    d.class_type,                 // class_type
    d.source_order_id || '',      // source_order_id
    d.sessions_purchased,         // sessions_purchased
    d.sessions_used || 0,         // sessions_used
    d.sessions_remaining,         // sessions_remaining
    now.toISOString(),            // created_at
    expiresAt.toISOString(),      // expires_at
    '',                           // last_used_at
    '',                           // last_used_source
    'active',                     // status
  ]);
  return creditId;
}

// Deduct one session from CFR Credits — by credit_id OR by email (uses first active credit)
// Returns { success, credit_id, credits_remaining, message }
function _deductCredit(creditIdOrEmail, source) {
  var sheet  = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Credits');
  var data   = sheet.getDataRange().getValues();
  var now    = new Date();

  // CFR Credits columns (0-indexed): credit_id(0), square_customer_id(1), customer_email(2),
  // customer_name(3), class_type(4), source_order_id(5), sessions_purchased(6),
  // sessions_used(7), sessions_remaining(8), created_at(9), expires_at(10),
  // last_used_at(11), last_used_source(12), status(13)

  var isById = creditIdOrEmail.startsWith('CRD-');

  for (var i = 1; i < data.length; i++) {
    var row      = data[i];
    var rowCid   = String(row[0]);
    var rowEmail = String(row[2]).toLowerCase().trim();
    var status   = String(row[13]).toLowerCase();

    var matches = isById
      ? rowCid === creditIdOrEmail
      : rowEmail === creditIdOrEmail.toLowerCase().trim();

    if (!matches) continue;
    if (status === 'exhausted' || status === 'expired') continue;

    var expiresAt = row[10];
    if (expiresAt && new Date(expiresAt) < now) {
      sheet.getRange(i + 1, 14).setValue('expired');
      continue;
    }

    var remaining = Number(row[8]);
    if (remaining < 1) continue;

    var newRemaining = remaining - 1;
    sheet.getRange(i + 1, 8).setValue(Number(row[7]) + 1);  // sessions_used
    sheet.getRange(i + 1, 9).setValue(newRemaining);         // sessions_remaining
    sheet.getRange(i + 1, 12).setValue(now.toISOString());   // last_used_at
    sheet.getRange(i + 1, 13).setValue(source || 'website'); // last_used_source
    if (newRemaining === 0) sheet.getRange(i + 1, 14).setValue('exhausted');

    return { success: true, credit_id: rowCid, credits_remaining: newRemaining };
  }
  return { success: false, message: 'No active credits found for this customer.' };
}

// Internal credits lookup — returns plain object (not JSON response)
function _checkCreditsData(email, classType) {
  var sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Credits');
  var data  = sheet.getDataRange().getValues();
  var now   = new Date();
  var norm  = email.toLowerCase().trim();

  for (var i = 1; i < data.length; i++) {
    var row       = data[i];
    var rowEmail  = String(row[2]).toLowerCase().trim();
    if (rowEmail !== norm) continue;

    var status = String(row[13]).toLowerCase();
    if (status === 'exhausted' || status === 'expired') continue;

    var expiresAt = row[10];
    if (expiresAt && new Date(expiresAt) < now) {
      sheet.getRange(i + 1, 14).setValue('expired');
      continue;
    }

    var remaining = Number(row[8]);
    if (remaining < 1) continue;

    // Check class type eligibility
    var rowClassType = String(row[4]).toLowerCase();
    if (classType) {
      var eligible = rowClassType === classType ||
        (rowClassType === 'dropin_3pack' && (classType === 'dropin' || classType === 'opengym'));
      if (!eligible) continue;
    }

    return {
      has_credits:       true,
      credit_id:         String(row[0]),
      credits_remaining: remaining,
      expires_at:        expiresAt ? new Date(expiresAt).toISOString() : '',
      pack_name_jp:      'ドロップイン 3回パック',
      pack_name_en:      'Drop In 3-Session Pack',
    };
  }
  return { has_credits: false, credits_remaining: 0 };
}

// Log a confirmed booking to CFR Bookings sheet
function _logBooking(d) {
  var now = new Date().toISOString();
  SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Bookings').appendRow([
    d.booking_id,         // booking_id
    now,                  // created_at
    d.class_type,         // class_type
    d.class_name_en,      // class_name_en
    d.class_name_jp,      // class_name_jp
    d.trainer || '',      // trainer
    d.class_date,         // class_date
    d.class_time_start,   // class_time_start
    d.class_time_end || '',// class_time_end
    d.duration || 60,     // duration
    d.calendar_event_id || '', // calendar_event_id
    d.customer_last,      // customer_last
    d.customer_first,     // customer_first
    d.customer_email,     // customer_email
    d.customer_phone || '',// customer_phone
    d.customer_address || '', // customer_address
    d.customer_dob || '',  // customer_dob
    d.customer_gender || '', // customer_gender
    d.square_customer_id || '', // square_customer_id
    d.square_order_id || '', // square_order_id
    d.square_payment_id || '', // square_payment_id
    d.catalog_object_id || '', // catalog_object_id
    d.price || 0,         // price
    d.payment_method,     // payment_method
    d.used_credit ? 'true' : 'false', // used_credit
    d.credit_id || '',    // credit_id
    d.source || 'website',// source
    d.status || 'confirmed', // status
    d.calendar_link || '', // calendar_link
    d.notes || '',        // notes
  ]);
}

// Add reservation event to Calendar 2
// Title format: [Class EN Name] — [Last Name] [First Name] — [booking_id]
function _addReservationEvent(d) {
  var reservationCal = CalendarApp.getCalendarById(CONFIG.CALENDAR_RESERVATIONS);

  var dateParts  = d.class_date.split('-').map(Number);
  var startParts = d.class_time_start.split(':').map(Number);
  var slotStart  = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], startParts[0], startParts[1], 0);
  var slotEnd    = new Date(slotStart.getTime() + (d.duration || 60) * 60 * 1000);

  // Try to get actual end time from Calendar 1
  if (d.class_time_end) {
    var endParts = d.class_time_end.split(':').map(Number);
    slotEnd = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], endParts[0], endParts[1], 0);
  }

  var title = d.class_name_en + ' — ' + d.customer_last + ' ' + d.customer_first + ' — ' + d.booking_id;

  reservationCal.createEvent(title, slotStart, slotEnd, {
    description:
      'Booking ID: ' + d.booking_id + '\n' +
      'Email: ' + d.email + '\n' +
      'Phone: ' + (d.phone || '—') + '\n' +
      'Class: ' + d.class_name_en,
  });
}

// Build Google Calendar quick-add link
function _calendarAddLink(title, date, timeStart, timeEnd) {
  try {
    var dateParts  = date.split('-').map(Number);
    var startParts = timeStart.split(':').map(Number);
    var endParts   = (timeEnd || '').split(':').map(Number);

    var fmt = function(d) {
      return Utilities.formatDate(d, CONFIG.TIMEZONE, "yyyyMMdd'T'HHmmss");
    };
    var s = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], startParts[0], startParts[1], 0);
    var e = endParts.length >= 2
      ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2], endParts[0], endParts[1], 0)
      : new Date(s.getTime() + 60 * 60 * 1000);

    return 'https://www.google.com/calendar/r/eventedit?' +
      'text='     + encodeURIComponent(title + ' @ CrossFit Roppongi') +
      '&dates='   + fmt(s) + '/' + fmt(e) +
      '&location=' + encodeURIComponent(CONFIG.GYM_LOCATION) +
      '&details=' + encodeURIComponent('CrossFit Roppongi booking — crossfitroppongi.com');
  } catch (ex) {
    return '';
  }
}

// ===== EMAIL: BOOKING CONFIRMATION (CUSTOMER) =====
function _sendBookingConfirmation(d) {
  var pack3line = '';
  if (d.pack === 'dropin_3pack' && d.newCreditId) {
    pack3line =
      '\n3回パック / 3-Session Pack\n' +
      '本日のセッションを含む残りセッション数 / Sessions remaining including today: 2\n' +
      '有効期限 / Expires: ' + _addDays(new Date(), CONFIG.CREDITS_EXPIRY_DAYS) + '\n';
  }

  var creditLine = d.paymentMethod === 'credit'
    ? 'セッションクレジット使用 / Session Credit Used'
    : d.paymentMethod === 'dropin_3pack'
    ? 'ドロップイン 3回パック / Drop In 3-Session Pack ¥11,550'
    : 'クレジットカード / Credit Card (Square)';

  var hasCoachNote = d.has_coach === false
    ? '\n⚠️ このセッションにはコーチはいません。\n   No coach for this session — gym floor open for personal training.\n'
    : '';

  var body =
    'ご予約ありがとうございます。\n' +
    'Thank you for your booking, ' + d.customer_first + ' ' + d.customer_last + '.\n' +
    'ジムでお会いできることを楽しみにしています。\n' +
    'We look forward to seeing you at the gym!\n\n' +
    '────────────────────────\n' +
    '注文番号 / Booking Number    ' + d.bookingId + '\n' +
    'クラス / Class               ' + d.class_name_jp + ' / ' + d.class_name_en + '\n' +
    '日時 / Date & Time           ' + d.class_date + ' · ' + d.class_time_start + (d.class_time_end ? '–' + d.class_time_end : '') + ' GMT+9\n' +
    'トレーナー / Trainer          ' + (d.trainer || 'Roppongi Staff') + '\n' +
    '所要時間 / Duration          ' + (d.duration || 60) + ' minutes\n' +
    hasCoachNote +
    '────────────────────────\n' +
    pack3line +
    'Googleカレンダーに追加 / Add to Google Calendar → ' + (d.calLink || '') + '\n\n' +
    '────────────────────────\n' +
    '決済方法 / Payment Method\n' +
    '  ' + creditLine + '\n\n' +
    '────────────────────────\n' +
    'お客様情報 / Customer Information\n' +
    '姓 / Last Name:           ' + d.customer_last  + '\n' +
    '名 / First Name:          ' + d.customer_first + '\n' +
    'メール / Email:            ' + d.email + '\n' +
    '電話 / Phone:             ' + (d.phone || '—') + '\n\n' +
    '────────────────────────\n' +
    '予約の変更またはキャンセルが必要な場合は、お気軽にご連絡ください。\n' +
    'If you need to cancel or change your reservation, please contact us.\n\n' +
    'お越しをお待ちしています。\n' +
    'Thank you and see you soon!\n\n' +
    'CrossFit Roppongi\n' +
    'crossfitroppongi.com\n' +
    CONFIG.GYM_ADDRESS_JP + '\n' +
    CONFIG.GYM_ADDRESS_EN;

  _emailCustomer(
    d.email,
    '予約確認 | Booking Confirmed — ' + CONFIG.GYM_NAME + ' (' + d.bookingId + ')',
    body
  );
}

// ===== EMAIL: BOOKING NOTIFICATION (ADMIN) =====
function _sendBookingAdminNotification(d) {
  var body =
    'New booking confirmed.\n\n' +
    'Booking ID : ' + d.bookingId       + '\n' +
    'Class      : ' + d.class_name_en   + ' / ' + d.class_name_jp + '\n' +
    'Date       : ' + d.class_date      + '\n' +
    'Time       : ' + d.class_time_start + '\n' +
    'Trainer    : ' + (d.trainer || '—') + '\n\n' +
    'Last Name  : ' + d.customer_last   + '\n' +
    'First Name : ' + d.customer_first  + '\n' +
    'Email      : ' + d.email           + '\n' +
    'Phone      : ' + (d.phone   || '—') + '\n' +
    'DOB        : ' + (d.dob     || '—') + '\n' +
    'Gender     : ' + (d.gender  || '—') + '\n' +
    'Address    : ' + (d.address || '—') + '\n\n' +
    'Payment    : ' + d.paymentMethod   + '\n' +
    'Order ID   : ' + (d.squareOrderId || '—') + '\n' +
    'Pack       : ' + (d.pack || 'single') + '\n' +
    'Credit ID  : ' + (d.usedCreditId || '—') + '\n' +
    'Notes      : ' + (d.notes || '—');

  _emailAdmin(
    '[Booking] ' + d.class_name_en + ' ' + d.class_date + ' ' + d.class_time_start + ' — ' + d.customer_last + ' ' + d.customer_first,
    body
  );
}

// ===== GENERAL HELPERS =====

function _logContactForm(d) {
  SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Forms').appendRow([
    new Date().toISOString(), 'contact',
    d.name, d.email, d.phone, d.inquiryType, d.message,
    '', '', '', '',
  ]);
}

function _logCareerForm(d) {
  SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Careers').appendRow([
    new Date().toISOString(),
    d.name, d.email, d.phone, d.position, d.birthday || '',
    d.gender || '', d.fileName || '', d.driveUrl || '', d.message || '',
  ]);
}

function _emailAdmin(subject, body) {
  try {
    GmailApp.sendEmail(CONFIG.STAFF_EMAILS, subject, body,
      { name: CONFIG.GYM_NAME + ' Website', replyTo: CONFIG.GYM_EMAIL });
  } catch (ex) { console.error('Admin email failed', ex); }
}

function _emailCustomer(toEmail, subject, body) {
  try {
    GmailApp.sendEmail(toEmail, subject, body,
      { name: CONFIG.GYM_NAME, replyTo: CONFIG.GYM_EMAIL });
  } catch (ex) { console.error('Customer email failed', ex); }
}

function _squareRequest(method, path, payload) {
  var options = {
    method:             method,
    headers: {
      'Authorization':  'Bearer ' + CONFIG.SQUARE_ACCESS_TOKEN,
      'Content-Type':   'application/json',
      'Square-Version': CONFIG.SQUARE_VERSION,
    },
    muteHttpExceptions: true,
  };
  if (payload) options.payload = JSON.stringify(payload);
  return JSON.parse(UrlFetchApp.fetch(CONFIG.SQUARE_BASE_URL + path, options).getContentText());
}

function _uuid() { return Utilities.getUuid(); }

function _getOrCreateDriveFolder(name) {
  var folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}

function _addDays(date, days) {
  var d = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

// ===== ONE-TIME SETUP — run manually from Apps Script editor =====
function setupSheetHeaders() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEETS_ID);

  var bookings = ss.getSheetByName('CFR Bookings');
  if (bookings && bookings.getLastRow() === 0) {
    bookings.appendRow([
      'booking_id','created_at','class_type','class_name_en','class_name_jp',
      'trainer','class_date','class_time_start','class_time_end','duration',
      'calendar_event_id','customer_last','customer_first','customer_email',
      'customer_phone','customer_address','customer_dob','customer_gender',
      'square_customer_id','square_order_id','square_payment_id',
      'catalog_object_id','price','payment_method',
      'used_credit','credit_id','source','status','calendar_link','notes',
    ]);
  }

  var credits = ss.getSheetByName('CFR Credits');
  if (credits && credits.getLastRow() === 0) {
    credits.appendRow([
      'credit_id','square_customer_id','customer_email','customer_name',
      'class_type','source_order_id','sessions_purchased','sessions_used',
      'sessions_remaining','created_at','expires_at',
      'last_used_at','last_used_source','status',
    ]);
  }

  var forms = ss.getSheetByName('CFR Forms');
  if (forms && forms.getLastRow() === 0) {
    forms.appendRow([
      'timestamp','form_type','name','email','phone',
      'inquiry_type','message','col8','col9','col10','col11',
    ]);
  }

  var careers = ss.getSheetByName('CFR Careers');
  if (careers && careers.getLastRow() === 0) {
    careers.appendRow([
      'timestamp','name','email','phone','position',
      'birthday','gender','file_name','file_url','message',
    ]);
  }

  Logger.log('Sheet headers ready.');
}