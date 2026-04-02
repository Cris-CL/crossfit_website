// CrossFit Roppongi — Apps Script Web App
// Booking backend: Calendar availability, Square payments, Sheets logging, GmailApp emails.
// Square Access Token lives here only — never in frontend.

// ===== CONFIGURATION =====
var CONFIG = {
  SHEETS_ID:             '1pNDApfzNDPUx36DuNScxI0kDIRF1NaEgcUrZi4n8Pac',
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
    foundation:        'SPR3UEYCK6PRWKFIZQE3BAI2',
  },

  // Class labels
  CLASS_NAME_EN: {
    trial:             'Trial Class',
    dropin:            'Drop In',
    drop_in:           'Drop In',   // underscore alias
    opengym:           'Open Gym',
    open_gym:          'Open Gym',  // underscore alias
    hyrox_performance: 'HYROX Performance',
    hyrox_strength:    'HYROX Strength',
    spartan:           'Spartan',
    foundation:        'Foundation',
  },
  CLASS_NAME_JP: {
    trial:             '体験レッスン',
    dropin:            'ドロップイン',
    drop_in:           'ドロップイン',            // underscore alias
    opengym:           'オープンジム',
    open_gym:          'オープンジム',            // underscore alias
    hyrox_performance: 'ハイロックス・パフォーマンス',
    hyrox_strength:    'HYROXストレングス',
    spartan:           'スパルタントレーニング',
    foundation:        'ファウンデーションプログラム',
  },

  // Wodify placeholder client IDs — assigned consecutively per time slot
  // Fill after calling ?action=listWodifyClients to find numeric IDs
  WODIFY_TRIAL_CLIENT_IDS:  [4525777, 4525779, 4525780, 4525781],                    // Trial 1–4
  WODIFY_DROPIN_CLIENT_IDS: [4525783, 4525785, 5639563, 5639565, 5639569, 5639573],  // DropIn 1–6 (also opengym)

  // Spartan coupon codes — static, distributed to select customers
  // type: 'fixed' (JPY amount off) | 'percent' (percentage off)
  COUPONS: {
    'LEONIDAS': { class_type: 'spartan', type: 'fixed', amount: 1000, label: '¥1,000 OFF' },
  },

  // Email template Google Docs (edit these docs to change email bodies)
  TRIAL_REMINDER_DOC_ID:      '1bsRNuuMvob-LFNYuX4Xq-cXhy4SNV-BGEX2BwSjI3lc',
  FOUNDATION_REMINDER_DOC_ID: '1rjhhdNb-RA1vqzOMyx9C7LBvhBSO8yL2u9kk0xVaXYA',

  CREDITS_EXPIRY_DAYS:   90,
  ADMIN_PASSWORD:        'gBaN0EP8XBjuA8P',
  TIMEZONE:              'Asia/Tokyo',
  GYM_NAME:              'CrossFit Roppongi',
  GYM_EMAIL:             'bookings@crossfitroppongi.com',
  GYM_ADDRESS_JP:        '〒106-0032 東京都港区六本木７−４−８ ウインドビル B1F\nTEL：03-6438-9813',
  GYM_ADDRESS_EN:        '〒106-0032 Tokyo, Minato-ku, Roppongi 7-4-8 Wind Building B1F, Japan\nTEL：03-6438-9813',
  GYM_LOCATION:          '〒106-0032 東京都港区六本木７−４−８ ウインドビル B1F',
  BOOKING_CC:            'tsujimoto@crossfitroppongi.com, sato@crossfitroppongi.com, kozukarei@crossfitroppongi.com',
  FORM_CC:               'alvaroaltamirano@crossfitroppongi.com, tsujimoto@crossfitroppongi.com, bruce@crossfitroppongi.com, sato@crossfitroppongi.com, kozukarei@crossfitroppongi.com',

  // Wodify Lead Sync
  WODIFY_API_KEY:     'm2oSGJq4xX2MtdX0V0Rfk5nszG80SJZV2dx8PU9Z',
  WODIFY_BASE_URL:    'https://api.wodify.com/v1',
  WODIFY_LOCATION_ID: 2598,
  WODIFY_SOURCE_IDS: {
    'Friend/Family':               83417,
    'Facebook/Instagram':          83418,
    'Internet/Blog/Search Engine': 83419,
    'SMS':                         83420,
    'Online Sales':                83421,
    'Other':                       83422,
    'Media (Magazine/TV)':         88439,
    'Poster/Pamphlet/Flyer':       88440,
    'While walking around':        88441,
    'Event/Staff':                 88442,
    'Returning Customer':          376393,
  },
  WODIFY_STATUS_IDS: {
    trial:             59869, // "Trial"
    dropin:            64255, // "Drop in"
    opengym:           64255, // "Drop in" (same as dropin)
    hyrox_performance: 64256, // "Hyrox"
    hyrox_strength:    64256, // "Hyrox"
    spartan:           64254, // "Spartan"
    foundation:        59869, // "Trial" (closest match — update if a Foundation status is added)
  },

  // Wodify program_name → website class_type mapping (single source of truth for schedule)
  // Keys must match exact Wodify program_name strings from GET /classes API
  // Values are ARRAYS — one Wodify program can emit multiple website class types
  // (e.g., CrossFit emits both dropin + trial slots from the same physical class)
  WODIFY_CLASS_MAP: {
    'CrossFit': [
      { class_type: 'dropin',  capacity: 6,  price: 4950,  has_coach: true,  coach: 'Roppongi Staff' },
      { class_type: 'trial',   capacity: 3,  price: 3300,  has_coach: true,  coach: 'Roppongi Staff' },
    ],
    'Open Gym': [
      { class_type: 'opengym', capacity: 6,  price: 4950,  has_coach: false, coach: '' },
      { class_type: 'trial',   capacity: 3,  price: 3300,  has_coach: true,  coach: 'Roppongi Staff' },
    ],
    'HYROX Performance': [{ class_type: 'hyrox_performance', capacity: 15, price: 4950,  has_coach: true,  coach: 'Marc Keen' }],
    'HYROX Strength':    [{ class_type: 'hyrox_strength',    capacity: 16, price: 4950,  has_coach: false, coach: 'Roppongi Staff' }],
    'Spartan':        [{ class_type: 'spartan',           capacity: 23, price: 4400,  has_coach: true,  coach: 'Marc Keen' }],
    'Foundation':     [{ class_type: 'foundation',        capacity: 3,  price: 18500, has_coach: false, coach: '' }],
  },

  // Minimum hours before class start that a booking is allowed
  BOOKING_CUTOFF_HOURS: {
    trial:             12,
    dropin:            4,
    opengym:           4,
    hyrox_performance: 4,
    hyrox_strength:    4,
    spartan:           4,
    foundation:        4,
  },

  // Centralized JST offset — used for cutoff calculations
  JST_OFFSET: '+09:00',
};

// ===== CACHE HELPERS =====
var CACHE_TTL_4H = 14400;
var CACHE_TTL_1H =  3600;

function _cacheGet(key) {
  try { var r = CacheService.getScriptCache().get(key); return r ? JSON.parse(r) : null; } catch(e) { return null; }
}
function _cacheSet(key, data, ttl) {
  try { CacheService.getScriptCache().put(key, JSON.stringify(data), ttl || CACHE_TTL_4H); } catch(e) {}
}
function _cacheDelete(key) {
  try { CacheService.getScriptCache().remove(key); } catch(e) {}
}


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
    if (action === 'cacheStatus')        return _getCacheStatus();
    if (action === 'testCreateBooking')  return _testCreateBooking(e.parameter);
    if (action === 'listWodifyClients')      return _listWodifyClients();
    if (action === 'listWodifyClasses')      return _listWodifyClasses(e.parameter.page, e.parameter.date);
    if (action === 'probeWodifyDateFilter')  return _probeWodifyDateFilter(e.parameter.date);
    if (action === 'buildWodifyCache')       return _ok(_buildWodifyClassCache());
    if (action === 'updateWodifyCache')      return _ok(_updateWodifyClassCache());
    if (action === 'enrichTrialCache')      return _ok(_enrichWodifyTrialCache());
    if (action === 'probeWodifyLeads')       return _probeWodifyLeads(e.parameter);
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

// ===== WODIFY SCHEDULE HELPERS =====

// Read class schedule from Wodify PropertiesService cache for a single date.
// WODIFY_CLASS_MAP values are arrays — one Wodify class can emit multiple website slots
// (e.g., a CrossFit class emits both dropin + trial slots).
// Trial slots are gated by trial_available in the cache entry.
// Booking cutoffs filter out classes too close to start time.
// Returns array of slot objects (without booking counts — caller adds those).
function _getWodifySchedule(dateStr, classTypeFilter) {
  var cacheJson = PropertiesService.getScriptProperties().getProperty('WODIFY_CLASS_CACHE');
  if (!cacheJson) return [];
  var cache = JSON.parse(cacheJson);
  var slots = [];
  var nowMs = Date.now();

  Object.keys(cache).forEach(function(key) {
    if (key.substring(0, 10) !== dateStr) return;
    var entry = cache[key];
    if (typeof entry !== 'object' || !entry.program) return; // skip legacy bare IDs
    var entryId = entry.id;
    var program = entry.program;
    var mapEntries = CONFIG.WODIFY_CLASS_MAP[program];
    if (!mapEntries) return; // unknown/ignored program — skip

    var timeStart = key.substring(11, 16); // "HH:MM"
    var timeEnd = '', duration = 60;
    if (entry.end_time) {
      timeEnd = entry.end_time.substring(11, 16);
      var s = parseInt(timeStart.substring(0, 2), 10) * 60 + parseInt(timeStart.substring(3, 5), 10);
      var e = parseInt(timeEnd.substring(0, 2), 10) * 60 + parseInt(timeEnd.substring(3, 5), 10);
      duration = (e - s > 0) ? (e - s) : 60;
    }

    // Compute hours until class start (JST)
    var classStartMs = new Date(dateStr + 'T' + timeStart + ':00' + CONFIG.JST_OFFSET).getTime();
    var hoursUntil   = (classStartMs - nowMs) / 3600000;

    mapEntries.forEach(function(map) {
      var ct = map.class_type;

      // classTypeFilter match
      if (classTypeFilter && ct.replace(/_/g, '') !== classTypeFilter.replace(/_/g, '')) return;

      // Trial gating: only emit if Wodify says trial is available for this class
      if (ct === 'trial' && entry.trial_available !== true) return;

      // Booking cutoff
      var cutoff = CONFIG.BOOKING_CUTOFF_HOURS[ct] || 4;
      if (hoursUntil < cutoff) return;

      slots.push({
        event_id:          entryId,
        class_type:        ct,
        class_name_en:     CONFIG.CLASS_NAME_EN[ct] || program,
        class_name_jp:     CONFIG.CLASS_NAME_JP[ct] || program,
        coach:             map.coach,  // no fallback — '' means no coach (Open Gym)
        has_coach:         map.has_coach,
        time_start:        timeStart,
        time_end:          timeEnd,
        start_iso:         dateStr + 'T' + timeStart + ':00',
        end_iso:           timeEnd ? (dateStr + 'T' + timeEnd + ':00') : '',
        duration:          duration,
        capacity:          map.capacity,
        catalog_object_id: CONFIG.CATALOG[ct] || '',
        price:             map.price,
      });
    });
  });
  slots.sort(function(a, b) { return a.time_start.localeCompare(b.time_start); });
  return slots;
}

// Read CFR Bookings sheet once, return booking count map { "type|date|time": count }.
// Dropin/opengym are grouped together since they share capacity.
function _buildBookingCountMap() {
  var sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Bookings');
  var data = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][27]) !== 'confirmed') continue;
    var rowType = String(data[i][2]);
    var rawDate = data[i][6], rawTime = data[i][7];
    var rowDate = (rawDate instanceof Date)
      ? Utilities.formatDate(rawDate, CONFIG.TIMEZONE, 'yyyy-MM-dd') : String(rawDate);
    var rowTime = (rawTime instanceof Date)
      ? Utilities.formatDate(rawTime, CONFIG.TIMEZONE, 'HH:mm') : String(rawTime);
    var normType = (rowType === 'dropin' || rowType === 'opengym' ||
                    rowType === 'drop_in' || rowType === 'open_gym')
      ? 'dropin_group' : rowType;
    var key = normType + '|' + rowDate + '|' + rowTime;
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

// Look up booked count from pre-built map
function _getBookedCount(countMap, classType, date, timeStart) {
  var norm = (classType === 'dropin' || classType === 'opengym' ||
              classType === 'drop_in' || classType === 'open_gym')
    ? 'dropin_group' : classType;
  return countMap[norm + '|' + date + '|' + timeStart] || 0;
}

// ===== GET: AVAILABILITY =====
// ?action=availability&date=YYYY-MM-DD&classType=dropin
// Reads schedule from Wodify PropertiesService cache, booking counts from CFR Bookings sheet.
// Same-day requests bypass CacheService — cutoffs need current Date.now().
function _getAvailability(params) {
  var date      = params.date;
  var classType = (params.classType || '').toLowerCase().replace(/_/g, '');
  if (!date) return _err('date parameter required (YYYY-MM-DD)');

  // Today's availability is always fresh — cutoffs need current Date.now()
  var todayStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  var isToday  = (date === todayStr);

  if (!isToday) {
    var cacheKey = 'avail_' + classType + '_' + date;
    var cached   = _cacheGet(cacheKey);
    if (cached)  return _ok(cached);
  }

  var rawSlots = _getWodifySchedule(date, classType);
  var countMap = _buildBookingCountMap();

  var slots = rawSlots.map(function(s) {
    var booked    = _getBookedCount(countMap, s.class_type, date, s.time_start);
    var available = Math.max(0, s.capacity - booked);
    return Object.assign({}, s, { booked: booked, available: available });
  });

  var result = { date: date, class_type: classType, slots: slots };
  if (!isToday) _cacheSet('avail_' + classType + '_' + date, result, CACHE_TTL_4H);
  return _ok(result);
}

// ===== GET: MONTH AVAILABILITY =====
// ?action=monthAvailability&year=2026&month=3&classType=dropin
function _getMonthAvailability(params) {
  var year      = parseInt(params.year,  10);
  var month     = parseInt(params.month, 10); // 1-based
  var classType = (params.classType || '').toLowerCase().replace(/_/g, '');
  if (!year || !month) return _err('year and month parameters required');

  var cacheKey = 'month_' + classType + '_' + year + '_' + month;
  var cached   = _cacheGet(cacheKey);
  if (cached)  return _ok(cached);

  var countMap = _buildBookingCountMap();
  var dateMap  = {};
  var lastDay  = new Date(year, month, 0).getDate();

  for (var d = 1; d <= lastDay; d++) {
    var ds = year + '-' + String(month).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var daySlots = _getWodifySchedule(ds, classType);
    daySlots.forEach(function(s) {
      var booked    = _getBookedCount(countMap, s.class_type, ds, s.time_start);
      var available = Math.max(0, s.capacity - booked);
      if (!dateMap[ds]) dateMap[ds] = { has_availability: false, slots: 0 };
      if (available > 0) {
        dateMap[ds].has_availability = true;
        dateMap[ds].slots += available;
      }
    });
  }

  var result = { year: year, month: month, class_type: classType, dates: dateMap };
  _cacheSet(cacheKey, result, CACHE_TTL_4H);
  return _ok(result);
}

// ===== GET: UPCOMING CLASSES (list view for HYROX / Spartan) =====
// ?action=upcomingClasses&classType=spartan[&limit=5&offset=0]
function _getUpcomingClasses(params) {
  var classType = (params.classType || '').toLowerCase().replace(/_/g, '');
  var limit     = Math.min(parseInt(params.limit  || '5',  10), 20);
  var offset    = Math.max(parseInt(params.offset || '0',  10), 0);
  if (!classType) return _err('classType required');

  var cacheKey = 'upcoming_' + classType;
  var cached   = _cacheGet(cacheKey);
  var allSlots;

  if (cached) {
    allSlots = cached;
  } else {
    var countMap = _buildBookingCountMap();
    var dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    allSlots = [];

    for (var d = 0; d < 90; d++) {
      var day = new Date();
      day.setDate(day.getDate() + d);
      var ds = Utilities.formatDate(day, CONFIG.TIMEZONE, 'yyyy-MM-dd');
      var daySlots = _getWodifySchedule(ds, classType);

      daySlots.forEach(function(s) {
        var booked    = _getBookedCount(countMap, s.class_type, ds, s.time_start);
        var available = Math.max(0, s.capacity - booked);
        allSlots.push(Object.assign({}, s, {
          date: ds, day_of_week: dayNames[day.getDay()],
          booked: booked, available: available,
        }));
      });
    }

    allSlots.sort(function(a, b) {
      return a.date.localeCompare(b.date) || a.time_start.localeCompare(b.time_start);
    });
    _cacheSet(cacheKey, allSlots, CACHE_TTL_4H);
  }

  var paged   = allSlots.slice(offset, offset + limit);
  var hasMore = (offset + limit) < allSlots.length;
  return _ok({ slots: paged, total: allSlots.length, has_more: hasMore, offset: offset, limit: limit });
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
  var coach         = body.coach         || '';
  var lead_source   = body.lead_source   || '';
  var catalog_obj   = body.catalog_object_id || CONFIG.CATALOG[class_type] || '';
  var duration      = body.duration      || 60;
  var price         = body.price         || 0;

  // ── payment fields ──
  var pack          = body.pack          || 'single'; // 'single' | 'dropin_3pack' | 'three_pack'
  if (pack === 'three_pack')       return _postCreateBookingThreePack(body);
  if (pack === 'foundation_3pack') return _postCreateBookingFoundation(body);
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
  var reservationEvent = _addReservationEvent({
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

  // ── 4a. Set reservation event color by class type ──
  var _colorMap = {
    'dropin':            CalendarApp.EventColor.CYAN,
    'opengym':           CalendarApp.EventColor.CYAN,
    'hyrox_strength':    CalendarApp.EventColor.CYAN,
    'trial':             CalendarApp.EventColor.YELLOW,
    'spartan':           CalendarApp.EventColor.BLUE,
    'hyrox_performance': CalendarApp.EventColor.BLUE,
    'foundation':        CalendarApp.EventColor.TEAL,
  };
  var _evColor = _colorMap[class_type];
  if (_evColor && reservationEvent) reservationEvent.setColor(_evColor);

  // ── 5. Build Google Calendar quick-add link ──
  var calLink = _calendarAddLink(class_name_en, class_date, class_time_start, class_time_end);

  // ── 6. Log to CFR Bookings ──
  _logBooking({
    booking_id:         bookingId,
    class_type:         class_type,
    class_name_en:      class_name_en,
    class_name_jp:      class_name_jp,
    coach:              coach,
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
    lead_source:        lead_source,
    status:             'confirmed',
    calendar_link:      calLink,
    notes:              notes,
  });

  // ── 6b. Wodify lead sync (non-blocking) ──
  try {
    var _wr = _syncWodifyLead({
      email: email, first_name: customer_first, last_name: customer_last,
      phone: phone, lead_source: lead_source, class_type: class_type,
    });
    _updateBookingWodifyResult(bookingId, _wr.status, new Date().toISOString(), _wr.wodify_lead_id || '');
  } catch(e) {
    console.error('Wodify sync failed', e);
    _updateBookingWodifyResult(bookingId, 'error', new Date().toISOString(), '');
  }

  // ── 6c. Wodify placeholder reservation ──
  var _wPlaceholderIds = null;
  var _wCtNorm = class_type.replace(/_/g, '');
  if (_wCtNorm === 'trial')                                                                 _wPlaceholderIds = CONFIG.WODIFY_TRIAL_CLIENT_IDS;
  else if (_wCtNorm === 'dropin' || _wCtNorm === 'opengym' || _wCtNorm === 'hyroxstrength') _wPlaceholderIds = CONFIG.WODIFY_DROPIN_CLIENT_IDS;

  if (_wPlaceholderIds && _wPlaceholderIds.length > 0) {
    try {
      var _slotIdx        = _countSlotBookings(class_type, class_date, class_time_start) - 1;
      var _wPlaceholderId = _wPlaceholderIds[_slotIdx];
      if (_wPlaceholderId) {
        var _startISO = class_date + 'T' + class_time_start + ':00' + CONFIG.JST_OFFSET;
        var _wClassId = _findWodifyClassByDateTime(_startISO);
        if (_wClassId) _reserveWodifyClass(_wPlaceholderId, _wClassId);
      }
      // If undefined (slot idx >= array length), all placeholders taken — skip silently
    } catch(e) { console.error('Wodify placeholder reservation failed', e); }
  }

  // ── 7. Send emails ──
  _sendBookingAdminNotification({
    bookingId: bookingId, class_name_en: class_name_en, class_name_jp: class_name_jp,
    class_date: class_date, class_time_start: class_time_start, coach: coach,
    customer_last: customer_last, customer_first: customer_first,
    email: email, phone: phone, dob: dob, gender: gender, address: address,
    paymentMethod: paymentMethod, squareOrderId: squareOrderId, price: price, notes: notes,
    pack: pack, usedCreditId: usedCreditId,
  });

  if (email) {
    _sendBookingConfirmation({
      bookingId: bookingId, class_name_en: class_name_en, class_name_jp: class_name_jp,
      class_date: class_date, class_time_start: class_time_start, class_time_end: class_time_end,
      duration: duration, coach: coach,
      customer_last: customer_last, customer_first: customer_first,
      email: email, phone: phone, paymentMethod: paymentMethod,
      price: price, calLink: calLink,
      pack: pack, newCreditId: newCreditId,
      has_coach: body.has_coach !== false,
    });
  }

  // ── 8. Cache invalidation ──
  var _bd = class_date;
  var _ct = class_type.toLowerCase().replace(/_/g, '');
  var _dp = _bd.split('-');
  _cacheDelete('avail_' + _ct + '_' + _bd);
  _cacheDelete('upcoming_' + _ct);
  if (_dp.length === 3) {
    _cacheDelete('month_' + _ct + '_' + _dp[0] + '_' + parseInt(_dp[1], 10));
    if (_ct === 'dropin' || _ct === 'opengym') {
      _cacheDelete('avail_dropin_'  + _bd); _cacheDelete('avail_opengym_'  + _bd);
      _cacheDelete('month_dropin_'  + _dp[0] + '_' + parseInt(_dp[1], 10));
      _cacheDelete('month_opengym_' + _dp[0] + '_' + parseInt(_dp[1], 10));
    }
  }

  return _ok({
    booking_id:        bookingId,
    calendar_link:     calLink,
    credits_remaining: newCreditId ? 2 : undefined,
  });
}

// ===== POST: CREATE BOOKING — 3-PACK (3 sessions, 1 payment) =====
function _postCreateBookingThreePack(body) {
  var class_type     = body.class_type    || '';
  var customer_first = body.customer_first || '';
  var customer_last  = body.customer_last  || '';
  var email          = (body.email || '').trim();
  var phone          = (body.phone || '').trim();
  var dob            = body.dob    || '';
  var gender         = body.gender || '';
  var address        = body.address || '';
  var notes          = body.notes   || '';
  var sourceId       = body.sourceId || '';
  var verToken       = body.verificationToken || '';
  var sessions       = body.sessions || []; // [{event_id, class_date, class_time_start, class_time_end}]
  var class_name_en  = body.class_name_en || CONFIG.CLASS_NAME_EN[class_type] || class_type;
  var class_name_jp  = body.class_name_jp || CONFIG.CLASS_NAME_JP[class_type] || class_type;
  var coach          = body.coach    || '';
  var duration       = body.duration || 60;

  // ── validation ──
  if (!class_type)          return _err('class_type is required.');
  if (sessions.length !== 3) return _err('3-pack requires exactly 3 sessions.');
  if (!email)               return _err('Email is required.');
  if (!dob)                 return _err('Date of birth is required.');
  if (!gender)              return _err('Gender is required.');
  if (!sourceId)            return _err('Payment token (sourceId) is required.');
  for (var si = 0; si < 3; si++) {
    if (!sessions[si].class_date)       return _err('class_date is required for session ' + (si + 1) + '.');
    if (!sessions[si].class_time_start) return _err('class_time_start is required for session ' + (si + 1) + '.');
  }

  // ── 1. Square Customer ──
  var squareCustomerId = _squareUpsertCustomer({
    given_name:    customer_first,
    family_name:   customer_last,
    email_address: email,
    phone_number:  phone,
    address:       address,
    birthday:      dob,
  });

  // ── 2. Square Order + Payment (¥11,550 — 1 order for all 3 sessions) ──
  var packVariationId = CONFIG.CATALOG['dropin_3pack'];
  if (!packVariationId) return _err('3-pack catalog item not configured.');

  var orderRes = _squareRequest('POST', '/orders', {
    idempotency_key: _uuid(),
    order: {
      location_id: CONFIG.SQUARE_LOCATION_ID,
      customer_id: squareCustomerId || undefined,
      line_items:  [{ catalog_object_id: packVariationId, quantity: '1' }],
      metadata: {
        class_type: class_type,
        pack:       'three_pack',
        dates:      sessions.map(function(s) { return s.class_date; }).join(','),
        source:     'website',
      },
    },
  });
  if (orderRes.errors) return _err(orderRes.errors[0].detail || 'Order creation failed.');
  var squareOrderId = orderRes.order.id;

  var payBody = {
    source_id:       sourceId,
    idempotency_key: _uuid(),
    amount_money:    orderRes.order.total_money,
    order_id:        squareOrderId,
    location_id:     CONFIG.SQUARE_LOCATION_ID,
    customer_id:     squareCustomerId || undefined,
    note:            'Drop In 3-Pack — ' + customer_last + ' ' + customer_first + ' — ' +
                     sessions.map(function(s) { return s.class_date; }).join(', '),
  };
  if (verToken) payBody.verification_token = verToken;

  var payRes = _squareRequest('POST', '/payments', payBody);
  if (payRes.errors) return _err(payRes.errors[0].detail || 'Payment failed.');
  var squarePaymentId = payRes.payment.id;

  // ── 3. Generate 3 booking IDs, calendar events, Sheets rows ──
  var bookingIds = [];
  var calLinks   = [];

  for (var i = 0; i < 3; i++) {
    var sess = sessions[i];
    var bId  = _generateBookingId();
    bookingIds.push(bId);

    var sessResEvent = _addReservationEvent({
      booking_id:       bId,
      class_name_en:    class_name_en,
      customer_last:    customer_last,
      customer_first:   customer_first,
      email:            email,
      phone:            phone,
      class_date:       sess.class_date,
      class_time_start: sess.class_time_start,
      class_time_end:   sess.class_time_end || '',
      class_type:       class_type,
      duration:         duration,
    });
    var _3pColorMap = {
      'drop_in':           CalendarApp.EventColor.CYAN,
      'open_gym':          CalendarApp.EventColor.CYAN,
      'hyrox_strength':    CalendarApp.EventColor.CYAN,
      'trial':             CalendarApp.EventColor.YELLOW,
      'spartan':           CalendarApp.EventColor.BLUE,
      'hyrox_performance': CalendarApp.EventColor.BLUE,
      'foundation':        CalendarApp.EventColor.TEAL,
    };
    var _3pColor = _3pColorMap[class_type];
    if (_3pColor && sessResEvent) sessResEvent.setColor(_3pColor);

    var calLink = _calendarAddLink(class_name_en, sess.class_date, sess.class_time_start, sess.class_time_end || '');
    calLinks.push(calLink);

    _logBooking({
      booking_id:         bId,
      class_type:         class_type,
      class_name_en:      class_name_en,
      class_name_jp:      class_name_jp,
      coach:              coach,
      class_date:         sess.class_date,
      class_time_start:   sess.class_time_start,
      class_time_end:     sess.class_time_end || '',
      duration:           duration,
      calendar_event_id:  sess.event_id || '',
      customer_last:      customer_last,
      customer_first:     customer_first,
      customer_email:     email,
      customer_phone:     phone,
      customer_address:   address,
      customer_dob:       dob,
      customer_gender:    gender,
      square_customer_id: squareCustomerId || '',
      square_order_id:    squareOrderId,
      square_payment_id:  squarePaymentId,
      catalog_object_id:  packVariationId,
      price:              i === 0 ? 11550 : 0,  // full price on row 1, 0 on rows 2 & 3
      payment_method:     'three_pack',
      used_credit:        false,
      credit_id:          '',
      source:             'website',
      status:             'confirmed',
      calendar_link:      calLink,
      notes:              notes,
    });
  }

  // ── 4. Admin notification ──
  var sessionsText = sessions.map(function(s, idx) {
    return '  Session ' + (idx + 1) + ': ' + s.class_date + ' ' + s.class_time_start;
  }).join('\n');

  try {
    GmailApp.sendEmail(
      CONFIG.STAFF_EMAILS,
      'CrossFit Roppongi | ' + class_name_en + ' 3-Pack — ' + customer_last + ' ' + customer_first + ' | ' + bookingIds.join(', '),
      'New 3-pack booking confirmed.\n\n' +
      'Booking IDs : ' + bookingIds.join(', ') + '\n' +
      'Class       : ' + class_name_en + ' / ' + class_name_jp + '\n' +
      'Sessions    :\n' + sessionsText + '\n' +
      'Coach       : ' + (coach || '—') + '\n\n' +
      'Last Name   : ' + customer_last  + '\n' +
      'First Name  : ' + customer_first + '\n' +
      'Email       : ' + email          + '\n' +
      'Phone       : ' + (phone   || '—') + '\n' +
      'DOB         : ' + (dob     || '—') + '\n' +
      'Gender      : ' + (gender  || '—') + '\n' +
      'Address     : ' + (address || '—') + '\n\n' +
      'Payment     : three_pack\n' +
      'Order ID    : ' + squareOrderId + '\n' +
      'Notes       : ' + (notes || '—'),
      { name: CONFIG.GYM_NAME, replyTo: CONFIG.GYM_EMAIL, cc: CONFIG.BOOKING_CC }
    );
  } catch (ex) { console.error('Admin email failed', ex); }

  // ── 5. Customer confirmation email ──
  if (email) {
    var sessionsEmailText = sessions.map(function(s, idx) {
      var num = ['①', '②', '③'][idx];
      return '  ' + num + ' ' + s.class_date + ' · ' + s.class_time_start + (s.class_time_end ? '–' + s.class_time_end : '') + ' GMT+9';
    }).join('\n');

    var calLinksText = calLinks.map(function(l, idx) {
      return '  ' + ['①', '②', '③'][idx] + ' → ' + l;
    }).join('\n');

    var sig3 = 'CrossFit Roppongi\n〒106-0032 Tokyo, Minato-ku, Roppongi 7-4-8 Wind Building B1F, Japan\ncrossfitroppongi.com\nTEL：03-6438-9813';

    try {
      GmailApp.sendEmail(
        email,
        'CrossFit Roppongi | 予約確認 (Booking Confirmed) | ' + bookingIds.join(', '),
        'ご予約ありがとうございます。\n' +
        'ジムでお会いできることを楽しみにしています。\n' +
        'Thank you for your booking, ' + customer_first + ' ' + customer_last + '.\n' +
        'We look forward to seeing you at the gym!\n\n' +
        '注文番号 / Booking Numbers\n' +
        '  ① ' + bookingIds[0] + '\n' +
        '  ② ' + bookingIds[1] + '\n' +
        '  ③ ' + bookingIds[2] + '\n' +
        'クラス / Class               ' + class_name_jp + ' / ' + class_name_en + '\n' +
        'コーチ / Coach               ' + (coach || 'Roppongi Staff') + '\n' +
        '所要時間 / Duration          ' + duration + ' minutes\n\n' +
        '日時 / Sessions\n' + sessionsEmailText + '\n\n' +
        'Googleカレンダーに追加 / Add to Google Calendar\n' + calLinksText + '\n\n' +
        '決済方法 / Payment Method\n' +
        'クレジットカード / Credit Card (Square)\n\n' +
        'お客様情報 / Customer Information\n' +
        '姓 / Last Name:           ' + customer_last  + '\n' +
        '名 / First Name:          ' + customer_first + '\n' +
        'メール / Email:            ' + email + '\n' +
        '電話 / Phone:             ' + (phone || '—') + '\n' +
        '住所 / Address:           ' + (address || '—') + '\n\n' +
        '予約の変更またはキャンセルが必要な場合は、お気軽にご連絡ください。\n' +
        'お越しをお待ちしています。\n' +
        'If you need to cancel or change your reservation, please contact us.\n' +
        'Thank you and see you soon!\n\n' +
        sig3,
        { name: CONFIG.GYM_NAME, replyTo: CONFIG.GYM_EMAIL }
      );
    } catch (ex) { console.error('Customer email failed', ex); }
  }

  return _ok({
    booking_ids:    bookingIds,
    calendar_links: calLinks,
    calendar_link:  calLinks[0],
  });
}

// ===== POST: CREATE BOOKING — FOUNDATION PROGRAM (3 sessions, 1 payment) =====
function _postCreateBookingFoundation(body) {
  var class_type     = 'foundation';
  var customer_first = body.customer_first || '';
  var customer_last  = body.customer_last  || '';
  var email          = (body.email || '').trim();
  var phone          = (body.phone || '').trim();
  var dob            = body.dob    || '';
  var gender         = body.gender || '';
  var address        = body.address || '';
  var notes          = body.notes   || '';
  var lead_source    = body.lead_source || '';
  var sourceId       = body.sourceId || '';
  var verToken       = body.verificationToken || '';
  var sessions       = body.sessions || []; // [{event_id, class_date, class_time_start, class_time_end}]
  var duration       = body.duration || 60;

  // ── validation ──
  if (sessions.length !== 3) return _err('Foundation program requires exactly 3 sessions.');
  if (!email)                return _err('Email is required.');
  if (!dob)                  return _err('Date of birth is required.');
  if (!gender)               return _err('Gender is required.');
  if (!sourceId)             return _err('Payment token (sourceId) is required.');
  for (var si = 0; si < 3; si++) {
    if (!sessions[si].class_date)       return _err('class_date is required for session ' + (si + 1) + '.');
    if (!sessions[si].class_time_start) return _err('class_time_start is required for session ' + (si + 1) + '.');
  }

  // Sort sessions chronologically → #1 is earliest
  sessions = sessions.slice().sort(function(a, b) {
    return (a.class_date + a.class_time_start).localeCompare(b.class_date + b.class_time_start);
  });

  var class_name_en = CONFIG.CLASS_NAME_EN[class_type] || 'Foundation';
  var class_name_jp = CONFIG.CLASS_NAME_JP[class_type] || 'ファウンデーションプログラム';

  // ── 1. Square Customer ──
  var squareCustomerId = _squareUpsertCustomer({
    given_name:    customer_first,
    family_name:   customer_last,
    email_address: email,
    phone_number:  phone,
    address:       address,
    birthday:      dob,
  });

  // ── 2. Square Order + Payment (¥18,500) ──
  var foundationVariationId = CONFIG.CATALOG['foundation'];
  if (!foundationVariationId) return _err('Foundation catalog item not configured.');

  var orderRes = _squareRequest('POST', '/orders', {
    idempotency_key: _uuid(),
    order: {
      location_id: CONFIG.SQUARE_LOCATION_ID,
      customer_id: squareCustomerId || undefined,
      line_items:  [{ catalog_object_id: foundationVariationId, quantity: '1' }],
      metadata: {
        class_type: class_type,
        pack:       'foundation_3pack',
        dates:      sessions.map(function(s) { return s.class_date; }).join(','),
        source:     'website',
      },
    },
  });
  if (orderRes.errors) return _err(orderRes.errors[0].detail || 'Order creation failed.');
  var squareOrderId = orderRes.order.id;

  var payBody = {
    source_id:       sourceId,
    idempotency_key: _uuid(),
    amount_money:    orderRes.order.total_money,
    order_id:        squareOrderId,
    location_id:     CONFIG.SQUARE_LOCATION_ID,
    customer_id:     squareCustomerId || undefined,
    note:            'Foundation Program — ' + customer_last + ' ' + customer_first + ' — ' +
                     sessions.map(function(s) { return s.class_date; }).join(', '),
  };
  if (verToken) payBody.verification_token = verToken;

  var payRes = _squareRequest('POST', '/payments', payBody);
  if (payRes.errors) return _err(payRes.errors[0].detail || 'Payment failed.');
  var squarePaymentId = payRes.payment.id;

  // ── 3. Generate 3 booking IDs, calendar events, Sheets rows ──
  var bookingIds = [];
  var calLinks   = [];

  for (var i = 0; i < 3; i++) {
    var sess       = sessions[i];
    var sessionNum = i + 1; // #1 = earliest, chronologically sorted above
    var bId        = _generateBookingId();
    bookingIds.push(bId);

    // Each event titled "Foundation #N — Last First — booking_id"
    var sessResEvent = _addReservationEvent({
      booking_id:       bId,
      class_name_en:    'Foundation #' + sessionNum,
      customer_last:    customer_last,
      customer_first:   customer_first,
      email:            email,
      phone:            phone,
      class_date:       sess.class_date,
      class_time_start: sess.class_time_start,
      class_time_end:   sess.class_time_end || '',
      class_type:       class_type,
      duration:         duration,
    });
    if (sessResEvent) sessResEvent.setColor(CalendarApp.EventColor.TEAL);

    var calLink = _calendarAddLink('Foundation #' + sessionNum, sess.class_date, sess.class_time_start, sess.class_time_end || '');
    calLinks.push(calLink);

    _logBooking({
      booking_id:         bId,
      class_type:         class_type,
      class_name_en:      class_name_en,
      class_name_jp:      class_name_jp,
      coach:              '',
      class_date:         sess.class_date,
      class_time_start:   sess.class_time_start,
      class_time_end:     sess.class_time_end || '',
      duration:           duration,
      calendar_event_id:  sess.event_id || '',
      customer_last:      customer_last,
      customer_first:     customer_first,
      customer_email:     email,
      customer_phone:     phone,
      customer_address:   address,
      customer_dob:       dob,
      customer_gender:    gender,
      square_customer_id: squareCustomerId || '',
      square_order_id:    squareOrderId,
      square_payment_id:  squarePaymentId,
      catalog_object_id:  foundationVariationId,
      price:              i === 0 ? 18500 : 0, // full price on row 1, 0 on rows 2 & 3
      payment_method:     'foundation_3pack',
      used_credit:        false,
      credit_id:          '',
      lead_source:        lead_source,
      status:             'confirmed',
      calendar_link:      calLink,
      notes:              notes,
    });
  }

  // ── 5. Admin notification ──
  var sessionsText = sessions.map(function(s, idx) {
    return '  Foundation #' + (idx + 1) + ': ' + s.class_date + ' ' + s.class_time_start;
  }).join('\n');

  try {
    GmailApp.sendEmail(
      CONFIG.STAFF_EMAILS,
      'CrossFit Roppongi | Foundation Program — ' + customer_last + ' ' + customer_first + ' | ' + bookingIds.join(', '),
      'New Foundation Program booking confirmed.\n\n' +
      'Booking IDs : ' + bookingIds.join(', ') + '\n' +
      'Program     : ' + class_name_en + ' / ' + class_name_jp + '\n' +
      'Sessions    :\n' + sessionsText + '\n\n' +
      'Last Name   : ' + customer_last  + '\n' +
      'First Name  : ' + customer_first + '\n' +
      'Email       : ' + email          + '\n' +
      'Phone       : ' + (phone   || '—') + '\n' +
      'DOB         : ' + (dob     || '—') + '\n' +
      'Gender      : ' + (gender  || '—') + '\n' +
      'Address     : ' + (address || '—') + '\n\n' +
      'Payment     : foundation_3pack\n' +
      'Order ID    : ' + squareOrderId + '\n' +
      'Lead Source : ' + (lead_source || '—') + '\n' +
      'Notes       : ' + (notes || '—'),
      { name: CONFIG.GYM_NAME, replyTo: CONFIG.GYM_EMAIL, cc: CONFIG.BOOKING_CC }
    );
  } catch (ex) { console.error('Admin email failed', ex); }

  // ── 6. Customer confirmation email ──
  if (email) {
    var sessionsEmailText = sessions.map(function(s, idx) {
      var num = ['①', '②', '③'][idx];
      return '  ' + num + ' Foundation #' + (idx + 1) + ': ' + s.class_date + ' · ' + s.class_time_start + (s.class_time_end ? '–' + s.class_time_end : '') + ' GMT+9';
    }).join('\n');

    var calLinksText = calLinks.map(function(l, idx) {
      return '  ' + ['①', '②', '③'][idx] + ' → ' + l;
    }).join('\n');

    var sigFoundation = 'CrossFit Roppongi\n〒106-0032 Tokyo, Minato-ku, Roppongi 7-4-8 Wind Building B1F, Japan\ncrossfitroppongi.com\nTEL：03-6438-9813';

    try {
      GmailApp.sendEmail(
        email,
        'CrossFit Roppongi | ファウンデーション予約確認 (Foundation Booking Confirmed) | ' + bookingIds.join(', '),
        'ファウンデーションプログラムのご予約ありがとうございます！\n' +
        'ジムでお会いできることを楽しみにしています。\n' +
        'Thank you for booking the Foundation Program, ' + customer_first + ' ' + customer_last + '.\n' +
        'We look forward to seeing you at the gym!\n\n' +
        '予約番号 / Booking Numbers\n' +
        '  ① ' + bookingIds[0] + '\n' +
        '  ② ' + bookingIds[1] + '\n' +
        '  ③ ' + bookingIds[2] + '\n' +
        'プログラム / Program    ' + class_name_jp + ' / ' + class_name_en + '\n' +
        '所要時間 / Duration     60 minutes per session\n\n' +
        'セッション日時 / Sessions\n' + sessionsEmailText + '\n\n' +
        'Googleカレンダーに追加 / Add to Google Calendar\n' + calLinksText + '\n\n' +
        '決済方法 / Payment Method\n' +
        'クレジットカード / Credit Card (Square)\n\n' +
        'お客様情報 / Customer Information\n' +
        '姓 / Last Name:   ' + customer_last  + '\n' +
        '名 / First Name:  ' + customer_first + '\n' +
        'メール / Email:   ' + email + '\n' +
        '電話 / Phone:     ' + (phone || '—') + '\n' +
        '住所 / Address:   ' + (address || '—') + '\n\n' +
        '予約の変更またはキャンセルが必要な場合は、お気軽にご連絡ください。\n' +
        'お越しをお待ちしています。\n' +
        'If you need to cancel or change your reservation, please contact us.\n' +
        'Thank you and see you soon!\n\n' +
        sigFoundation,
        { name: CONFIG.GYM_NAME, replyTo: CONFIG.GYM_EMAIL }
      );
    } catch (ex) { console.error('Customer email failed', ex); }
  }

  return _ok({
    booking_ids:    bookingIds,
    calendar_links: calLinks,
    calendar_link:  calLinks[0],
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
    coach:              '',
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

  var div = ' – – – – – – – ENGLISH – – – – – – –';
  var sig = 'CrossFit Roppongi\n〒106-0032 Tokyo, Minato-ku, Roppongi 7-4-8 Wind Building B1F, Japan\ncrossfitroppongi.com\nTEL：03-6438-9813';

  var adminBody =
    '※このメールはシステムから自動で送信されています。\n\n' +
    name + '様よりお問い合わせがありました。\n\n' +
    'お問い合わせ内容 ： ' + inquiryType + '\n' +
    '氏名 ： ' + name + '様\n' +
    '電話番号 : ' + phone + '\n' +
    'メールアドレス : ' + email + '\n' +
    'お問い合わせ詳細: ' + message + '\n\n' +
    div + '\n\n' +
    '※This email has been sent automatically by the system.\n\n' +
    'An inquiry has been received from ' + name + '.\n\n' +
    'Inquiry Type: ' + inquiryType + '\n' +
    'Name: ' + name + '\n' +
    'Phone Number: ' + phone + '\n' +
    'Email Address: ' + email + '\n' +
    'Inquiry Details: ' + message + '\n\n' +
    sig;

  GmailApp.sendEmail(
    CONFIG.GYM_EMAIL,
    'CrossFit Roppongi | ' + inquiryType + ' | ' + name,
    adminBody,
    { name: CONFIG.GYM_NAME, replyTo: email, cc: CONFIG.FORM_CC }
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
    sig;

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

  var div     = ' – – – – – – – ENGLISH – – – – – – –';
  var sig     = 'CrossFit Roppongi\n〒106-0032 Tokyo, Minato-ku, Roppongi 7-4-8 Wind Building B1F, Japan\ncrossfitroppongi.com\nTEL：03-6438-9813';
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
    sig;

  try {
    GmailApp.sendEmail(CONFIG.GYM_EMAIL,
      'CrossFit Roppongi | ' + (position || 'General') + ' | ' + name,
      adminBody,
      { name: CONFIG.GYM_NAME, replyTo: CONFIG.GYM_EMAIL, cc: CONFIG.FORM_CC });
  } catch (ex) { console.error('Admin email failed', ex); }

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
    sig;

  _emailCustomer(
    email,
    'CrossFit Roppongi | ご応募ありがとうございます。(Thank you for your application)',
    customerBody
  );

  return _ok({});
}

// ===== BOOKING HELPERS =====

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
  var now = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
  SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Bookings').appendRow([
    d.booking_id,         // booking_id
    now,                  // created_at
    d.class_type,         // class_type
    d.class_name_en,      // class_name_en
    d.class_name_jp,      // class_name_jp
    d.coach || '',        // coach (col 6)
    d.class_date,         // class_date (col 7)
    d.class_time_start,   // class_time_start (col 8)
    d.class_time_end || '',// class_time_end (col 9)
    d.duration || 60,     // duration (col 10)
    d.calendar_event_id || '', // calendar_event_id (col 11)
    d.customer_last,      // customer_last (col 12)
    d.customer_first,     // customer_first (col 13)
    d.customer_email,     // customer_email (col 14)
    d.customer_phone || '',// customer_phone (col 15)
    d.customer_address || '', // customer_address (col 16)
    d.customer_dob || '',  // customer_dob (col 17)
    d.customer_gender || '', // customer_gender (col 18)
    d.square_customer_id || '', // square_customer_id (col 19)
    d.square_order_id || '', // square_order_id (col 20)
    d.square_payment_id || '', // square_payment_id (col 21)
    d.catalog_object_id || '', // catalog_object_id (col 22)
    d.price || 0,         // price (col 23)
    d.payment_method,     // payment_method (col 24)
    d.used_credit ? 'true' : 'false', // used_credit (col 25)
    d.credit_id || '',    // credit_id (col 26)
    d.lead_source || d.source || '', // lead_source / source (col 27 — repurposed)
    d.status || 'confirmed', // status (col 28)
    d.calendar_link || '', // calendar_link (col 29)
    d.notes || '',        // notes (col 30)
    '',                   // lead_status (col 31 — filled after Wodify sync)
    '',                   // sync_timestamp (col 32)
    '',                   // wodify_lead_id (col 33)
  ]);
}

// Count confirmed bookings in CFR Bookings for a given slot (used to pick placeholder index)
// Drop In and Open Gym are counted together since they share the same placeholder pool.
// NOTE: called after _logBooking, so the current booking IS already included in the count.
function _countSlotBookings(class_type, class_date, class_time_start) {
  var types = (class_type === 'dropin' || class_type === 'opengym' ||
               class_type === 'drop_in' || class_type === 'open_gym')
    ? ['dropin', 'opengym', 'drop_in', 'open_gym']
    : [class_type];
  var sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Bookings');
  var data  = sheet.getDataRange().getValues();
  var count = 0;
  for (var i = 1; i < data.length; i++) {
    // Sheets auto-converts date/time strings to Date objects — normalize before comparing
    var rawDate = data[i][6];
    var rawTime = data[i][7];
    var rowDate = (rawDate instanceof Date)
      ? Utilities.formatDate(rawDate, CONFIG.TIMEZONE, 'yyyy-MM-dd')
      : String(rawDate);
    var rowTime = (rawTime instanceof Date)
      ? Utilities.formatDate(rawTime, CONFIG.TIMEZONE, 'HH:mm')
      : String(rawTime);

    if (types.indexOf(String(data[i][2])) !== -1 &&  // col 3: class_type
        rowDate === class_date                      &&  // col 7: class_date
        rowTime === class_time_start               &&  // col 8: class_time_start
        String(data[i][27]) === 'confirmed') {          // col 28: status
      count++;
    }
  }
  return count;
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

  var createdEvent = reservationCal.createEvent(title, slotStart, slotEnd, {
    description:
      'Booking ID: ' + d.booking_id + '\n' +
      'Email: ' + d.email + '\n' +
      'Phone: ' + (d.phone || '—') + '\n' +
      'Class: ' + d.class_name_en,
  });
  return createdEvent;
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
    : 'クレジットカード / Credit Card (Square)';

  var hasCoachNote = d.has_coach === false
    ? '\n⚠️ このセッションにはコーチはいません。\n   No coach for this session — gym floor open for personal training.\n'
    : '';

  var sig = 'CrossFit Roppongi\n〒106-0032 Tokyo, Minato-ku, Roppongi 7-4-8 Wind Building B1F, Japan\ncrossfitroppongi.com\nTEL：03-6438-9813';

  var body =
    'ご予約ありがとうございます。\n' +
    'ジムでお会いできることを楽しみにしています。\n' +
    'Thank you for your booking, ' + d.customer_first + ' ' + d.customer_last + '.\n' +
    'We look forward to seeing you at the gym!\n\n' +
    '注文番号 / Booking Number    ' + d.bookingId + '\n' +
    'クラス / Class               ' + d.class_name_jp + ' / ' + d.class_name_en + '\n' +
    '日時 / Date & Time           ' + d.class_date + ' · ' + d.class_time_start + (d.class_time_end ? '–' + d.class_time_end : '') + ' GMT+9\n' +
    'コーチ / Coach               ' + (d.coach || 'Roppongi Staff') + '\n' +
    '所要時間 / Duration          ' + (d.duration || 60) + ' minutes\n' +
    hasCoachNote +
    pack3line +
    '\nGoogleカレンダーに追加 / Add to Google Calendar → ' + (d.calLink || '') + '\n\n' +
    '決済方法 / Payment Method\n' +
    creditLine + '\n' +
    '合計金額 / Total Amount      ¥' + (d.price ? d.price.toLocaleString() : '—') + '（税込 / Tax included）\n\n' +
    'お客様情報 / Customer Information\n' +
    '姓 / Last Name:           ' + d.customer_last  + '\n' +
    '名 / First Name:          ' + d.customer_first + '\n' +
    'メール / Email:            ' + d.email + '\n' +
    '電話 / Phone:             ' + (d.phone || '—') + '\n' +
    '住所 / Address:           ' + (d.address || '—') + '\n\n' +
    '予約の変更またはキャンセルが必要な場合は、お気軽にご連絡ください。\n' +
    'お越しをお待ちしています。\n' +
    'If you need to cancel or change your reservation, please contact us.\n' +
    'Thank you and see you soon!\n\n' +
    sig;

  _emailCustomer(
    d.email,
    'CrossFit Roppongi | 予約確認 (Booking Confirmed) | ' + d.bookingId,
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
    'Coach      : ' + (d.coach || '—') + '\n\n' +
    'Last Name  : ' + d.customer_last   + '\n' +
    'First Name : ' + d.customer_first  + '\n' +
    'Email      : ' + d.email           + '\n' +
    'Phone      : ' + (d.phone   || '—') + '\n' +
    'DOB        : ' + (d.dob     || '—') + '\n' +
    'Gender     : ' + (d.gender  || '—') + '\n' +
    'Address    : ' + (d.address || '—') + '\n\n' +
    'Payment    : ' + d.paymentMethod   + '\n' +
    'Order ID   : ' + (d.squareOrderId || '—') + '\n' +
    'Total      : ¥' + (d.price ? d.price.toLocaleString() : '—') + '\n' +
    'Pack       : ' + (d.pack || 'single') + '\n' +
    'Credit ID  : ' + (d.usedCreditId || '—') + '\n' +
    'Notes      : ' + (d.notes || '—');

  _emailAdmin(
    'CrossFit Roppongi | ' + d.class_name_en + ' ' + d.class_date + ' ' + d.class_time_start + ' — ' + d.customer_last + ' ' + d.customer_first + ' | ' + d.bookingId,
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
    GmailApp.sendEmail(CONFIG.GYM_EMAIL, subject, body,
      { name: CONFIG.GYM_NAME, replyTo: CONFIG.GYM_EMAIL, cc: CONFIG.BOOKING_CC });
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

// Read a Google Doc as plain text — used for editable email templates
function _getDocTemplate(docId) {
  try {
    return DocumentApp.openById(docId).getBody().getText();
  } catch(e) {
    console.error('_getDocTemplate failed for ' + docId, e);
    return '';
  }
}

function _addDays(date, days) {
  var d = new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

// ===== WODIFY HELPERS =====

// Sync a new lead to Wodify. Returns { success, status, wodify_lead_id }.
function _syncWodifyLead(d) {
  // Foundation program does not sync to Wodify leads
  if (d.class_type === 'foundation') return { success: true, status: 'skipped', wodify_lead_id: '' };

  // 1. Check for existing lead by email
  try {
    var searchRes = UrlFetchApp.fetch(
      CONFIG.WODIFY_BASE_URL + '/leads?email=' + encodeURIComponent(d.email),
      { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
    );
    var searchData = JSON.parse(searchRes.getContentText());
    // Wodify ignores the ?email= filter — returns all leads. Filter client-side.
    var allHits    = searchData.data || searchData.leads || [];
    var searchHits = allHits.filter(function(lead) {
      return (lead.email || '').toLowerCase() === d.email.toLowerCase();
    });
    if (searchHits.length > 0) {
      return { success: true, status: 'exists', wodify_lead_id: String(searchHits[0].id || '') };
    }
  } catch(e) { /* search endpoint may not be available — proceed to create */ }

  // 2. Create lead
  try {
    var payload = {
      location_id: CONFIG.WODIFY_LOCATION_ID,
      first_name:  d.first_name || '',
      last_name:   d.last_name  || '',
      email:       d.email      || '',
      phone_number: d.phone     || '',
    };
    // Only set lead_status_id for trial (59869) — confirmed valid from existing Wodify leads.
    // Other status IDs (dropin 64255, hyrox 64256, spartan 64254) cause leads to be hidden
    // in Wodify's UI and must be verified before re-enabling.
    var stId = CONFIG.WODIFY_STATUS_IDS[d.class_type];
    if (stId === 59869) payload.lead_status_id = stId;

    var res = UrlFetchApp.fetch(CONFIG.WODIFY_BASE_URL + '/leads', {
      method:      'post',
      contentType: 'application/json',
      payload:     JSON.stringify(payload),
      headers:     { 'x-api-key': CONFIG.WODIFY_API_KEY },
      muteHttpExceptions: true,
    });
    var data = JSON.parse(res.getContentText());
    var code = res.getResponseCode();
    if (code === 200 || code === 201) {
      return { success: true, status: 'created', wodify_lead_id: String(data.id || data.lead_id || '') };
    }
    return { success: false, status: 'error:' + code, wodify_lead_id: '', response_body: data };
  } catch(e) {
    return { success: false, status: 'error', wodify_lead_id: '', response_body: e.message };
  }
}

// Write Wodify sync result back to CFR Bookings (cols 31–33)
function _updateBookingWodifyResult(bookingId, lead_status, sync_timestamp, wodify_lead_id) {
  try {
    var sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Bookings');
    var data  = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === bookingId) {
        sheet.getRange(i + 1, 31).setValue(lead_status);
        sheet.getRange(i + 1, 32).setValue(sync_timestamp);
        sheet.getRange(i + 1, 33).setValue(wodify_lead_id);
        return;
      }
    }
  } catch(e) { console.error('_updateBookingWodifyResult failed', e); }
}

// Paginated scan of GET /clients to find client_id by email
function _findWodifyClientByEmail(email) {
  var page = 1;
  while (true) {
    var res  = UrlFetchApp.fetch(
      CONFIG.WODIFY_BASE_URL + '/clients?page=' + page + '&page_size=100',
      { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
    );
    var data    = JSON.parse(res.getContentText());
    var clients = data.clients || [];
    for (var i = 0; i < clients.length; i++) {
      if ((clients[i].email || '').toLowerCase() === email.toLowerCase()) return clients[i].id;
    }
    if (!data.pagination || !data.pagination.has_more) break;
    page++;
  }
  return null;
}

// Find Wodify class_id by start_date_time.
// Wodify API has no date filter — classes are sorted oldest-first across ~70 pages.
// Strategy: fetch page 1 to get total count, estimate the target page, scan ≤8 pages.
// Binary search for the last page of Wodify classes (API has no total count)
function _findWodifyLastPage() {
  var lo = 1, hi = 1000;
  while (lo < hi) {
    var mid     = Math.ceil((lo + hi) / 2);
    var res     = JSON.parse(UrlFetchApp.fetch(
      CONFIG.WODIFY_BASE_URL + '/classes?page=' + mid + '&page_size=100',
      { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
    ).getContentText());
    var classes = res.classes || [];
    if (!classes.length || !res.pagination || !res.pagination.has_more) {
      if (classes.length) return mid; // last non-empty page
      hi = mid - 1;
    } else {
      lo = mid;
    }
  }
  return lo;
}

// Build PropertiesService cache of future Wodify class IDs.
// Classes are stored by programs in separate creation-order batches — start_date_time is NOT
// monotonic across pages — so binary search fails. Full scan + cache is the only reliable fix.
// Run once from Apps Script IDE: _buildWodifyClassCache()
// Or via URL: ?action=buildWodifyCache  (may take 3–5 min; redeploy first)
function _buildWodifyClassCache() {
  var startTime = new Date();
  var nowMs     = startTime.getTime();
  var futureMs  = nowMs + 400 * 86400000; // 400 days ahead
  var lastPage  = _findWodifyLastPage();
  var cache     = {};
  var count     = 0;
  var MAX_MS    = 300000; // 5-minute safety limit — stops before 6-min GAS timeout

  for (var pg = 1; pg <= lastPage; pg++) {
    if (new Date().getTime() - nowMs > MAX_MS) {
      // Partial result — save what we have
      PropertiesService.getScriptProperties().setProperties({
        'WODIFY_CLASS_CACHE':          JSON.stringify(cache),
        'WODIFY_CLASS_CACHE_BUILT':    startTime.toISOString(),
        'WODIFY_CLASS_CACHE_COUNT':    String(count),
        'WODIFY_CLASS_CACHE_PARTIAL':  'stopped at page ' + pg + '/' + lastPage,
        'WODIFY_CLASS_CACHE_LASTPAGE': String(lastPage),
      }, false);
      return { entries: count, partial: true, stopped_at: pg, last_page: lastPage };
    }
    try {
      var resp = UrlFetchApp.fetch(
        CONFIG.WODIFY_BASE_URL + '/classes?page=' + pg + '&page_size=100',
        { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
      );
      if (resp.getResponseCode() !== 200) continue;
      var res = JSON.parse(resp.getContentText());
      (res.classes || []).forEach(function(c) {
        var clsMs = new Date(c.start_date_time).getTime();
        if (clsMs >= nowMs && clsMs <= futureMs) {
          cache[c.start_date_time] = {
            id:              c.id,
            program:         c.program_name || c.program || '',
            end_time:        c.end_date_time || '',
            trial_available: (c.has_free_trial_limit !== undefined)
              ? ((c.is_free_trial_online === undefined || c.is_free_trial_online === true)
                  && !c.is_free_trial_full && c.free_trial_limit > 0)
              : null,
          };
          count++;
        }
      });
    } catch(e) { /* skip failed page, continue */ }
  }

  PropertiesService.getScriptProperties().setProperties({
    'WODIFY_CLASS_CACHE':          JSON.stringify(cache),
    'WODIFY_CLASS_CACHE_BUILT':    startTime.toISOString(),
    'WODIFY_CLASS_CACHE_COUNT':    String(count),
    'WODIFY_CLASS_CACHE_PARTIAL':  'false',
    'WODIFY_CLASS_CACHE_LASTPAGE': String(lastPage),
  }, false);
  return { entries: count, partial: false, last_page: lastPage };
}

// Incremental daily update — only scans new pages since last build.
// Falls back to full rebuild if cache is missing or stale (> 8 days old).
// Returns { entries_total, new_entries, pages_scanned, full_rebuild }
function _updateWodifyClassCache() {
  var props     = PropertiesService.getScriptProperties();
  var cacheJson = props.getProperty('WODIFY_CLASS_CACHE');
  var builtStr  = props.getProperty('WODIFY_CLASS_CACHE_BUILT');
  var savedPage = parseInt(props.getProperty('WODIFY_CLASS_CACHE_LASTPAGE') || '0', 10);

  // Full rebuild if: no cache, no saved page, or cache is > 8 days old
  var cacheAge = builtStr ? (new Date() - new Date(builtStr)) / 86400000 : 999;
  if (!cacheJson || !savedPage || cacheAge > 8) {
    return Object.assign(_buildWodifyClassCache(), { full_rebuild: true });
  }

  var cache    = JSON.parse(cacheJson);
  var nowMs    = Date.now();
  var futureMs = nowMs + 400 * 86400000;

  // Prune entries that are now in the past (keep cache lean)
  Object.keys(cache).forEach(function(k) {
    if (new Date(k).getTime() < nowMs) delete cache[k];
  });

  // Find current last page
  var newLastPage = _findWodifyLastPage();
  // Scan from (savedPage - 2) to newLastPage — small overlap catches edge cases
  var startPg  = Math.max(1, savedPage - 2);
  var newCount = 0;

  for (var pg = startPg; pg <= newLastPage; pg++) {
    try {
      var resp = UrlFetchApp.fetch(
        CONFIG.WODIFY_BASE_URL + '/classes?page=' + pg + '&page_size=100',
        { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
      );
      if (resp.getResponseCode() !== 200) continue;
      var res = JSON.parse(resp.getContentText());
      (res.classes || []).forEach(function(c) {
        var clsMs = new Date(c.start_date_time).getTime();
        if (clsMs >= nowMs && clsMs <= futureMs) {
          if (!cache[c.start_date_time]) newCount++;
          cache[c.start_date_time] = {
            id:              c.id,
            program:         c.program_name || c.program || '',
            end_time:        c.end_date_time || '',
            trial_available: (c.has_free_trial_limit !== undefined)
              ? ((c.is_free_trial_online === undefined || c.is_free_trial_online === true)
                  && !c.is_free_trial_full && c.free_trial_limit > 0)
              : null,
          };
        }
      });
    } catch(e) { /* skip failed page */ }
  }

  var total = Object.keys(cache).length;
  props.setProperties({
    'WODIFY_CLASS_CACHE':          JSON.stringify(cache),
    'WODIFY_CLASS_CACHE_BUILT':    new Date().toISOString(),
    'WODIFY_CLASS_CACHE_COUNT':    String(total),
    'WODIFY_CLASS_CACHE_PARTIAL':  'false',
    'WODIFY_CLASS_CACHE_LASTPAGE': String(newLastPage),
  }, false);

  return { entries_total: total, new_entries: newCount,
           pages_scanned: newLastPage - startPg + 1, full_rebuild: false };
}

// Enrich trial availability from GET /classes/{id} detail endpoint.
// Re-fetches ALL CrossFit/Open Gym classes in next 14 days every run,
// so staff changes to free_trial settings propagate by next morning.
// Run daily at 3:30am (after _updateWodifyClassCache at 3am).
function _enrichWodifyTrialCache() {
  var props = PropertiesService.getScriptProperties();
  var cacheJson = props.getProperty('WODIFY_CLASS_CACHE');
  if (!cacheJson) return { enriched: 0 };
  var cache = JSON.parse(cacheJson);
  var nowMs = Date.now(), horizonMs = nowMs + 14 * 86400000;
  var trialPrograms = ['CrossFit', 'Open Gym'];
  var enriched = 0;

  Object.keys(cache).forEach(function(key) {
    var entry = cache[key];
    if (typeof entry !== 'object' || !entry.program) return;
    if (new Date(key).getTime() < nowMs || new Date(key).getTime() > horizonMs) return;
    if (trialPrograms.indexOf(entry.program) === -1) return;

    try {
      var resp = UrlFetchApp.fetch(
        CONFIG.WODIFY_BASE_URL + '/classes/' + entry.id,
        { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
      );
      if (resp.getResponseCode() !== 200) return;
      var detail = JSON.parse(resp.getContentText());
      entry.trial_available = detail.is_free_trial_online === true
        && !detail.is_free_trial_full
        && detail.free_trial_limit > 0;
      enriched++;
    } catch(e) { /* retry next run */ }
  });

  props.setProperty('WODIFY_CLASS_CACHE', JSON.stringify(cache));
  return { enriched: enriched };
}

function _findWodifyClassByDateTime(startDateTimeISO) {
  // Normalise to UTC milliseconds — handles both "+09:00" and "Z" formats
  var targetMs = new Date(startDateTimeISO).getTime();
  if (isNaN(targetMs)) return null;

  // Wodify stores start_date_time as JST naive with Z suffix (e.g. "2026-05-08T07:00:00Z" = 07:00 JST).
  // Shift +9h before formatting so our key matches Wodify's format.
  var pad      = function(n) { return String(n).padStart(2, '0'); };
  var jstD     = new Date(targetMs + 9 * 3600000);
  var key      = jstD.getUTCFullYear() + '-' + pad(jstD.getUTCMonth() + 1) + '-' + pad(jstD.getUTCDate()) +
                 'T' + pad(jstD.getUTCHours()) + ':' + pad(jstD.getUTCMinutes()) + ':' + pad(jstD.getUTCSeconds()) + 'Z';

  // Try PropertiesService cache (built by _buildWodifyClassCache / ?action=buildWodifyCache)
  var cacheJson = PropertiesService.getScriptProperties().getProperty('WODIFY_CLASS_CACHE');
  if (cacheJson) {
    var cache = JSON.parse(cacheJson);
    // Cache values are enriched objects { id, program, end_time, trial_available } — extract .id only
    if (cache[key]) {
      var val = cache[key];
      return (typeof val === 'object') ? val.id : val;
    }
    // Near-match scan (±1 min) — compare in JST naive space
    var targetNaiveMs = targetMs + 9 * 3600000;
    var keys = Object.keys(cache);
    for (var i = 0; i < keys.length; i++) {
      if (Math.abs(new Date(keys[i]).getTime() - targetNaiveMs) < 60000) {
        var nearVal = cache[keys[i]];
        return (typeof nearVal === 'object') ? nearVal.id : nearVal;
      }
    }
  }

  // Cache miss — fall back to backward page scan for recently-added one-time events
  // (recurring classes already in cache; newly added events land on last pages)
  var lastPage = _findWodifyLastPage();
  for (var pg = lastPage; pg >= Math.max(1, lastPage - 15); pg--) {
    var res = JSON.parse(UrlFetchApp.fetch(
      CONFIG.WODIFY_BASE_URL + '/classes?page=' + pg + '&page_size=100',
      { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
    ).getContentText());
    var cls = res.classes || [];
    for (var i = 0; i < cls.length; i++) {
      if (Math.abs(new Date(cls[i].start_date_time).getTime() - targetMs) < 60000) return cls[i].id;
    }
  }
  return null;
}

// Reserve a client into a Wodify class
// Returns { success, code, body } for diagnostics
function _reserveWodifyClass(clientId, classId) {
  try {
    var res  = UrlFetchApp.fetch(
      CONFIG.WODIFY_BASE_URL + '/classes/' + classId + '/clients/' + clientId + '/reserve',
      { method: 'post', headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
    );
    var code = res.getResponseCode();
    var body = res.getContentText();
    return { success: code === 200 || code === 201, code: code, body: body };
  } catch(e) {
    return { success: false, code: 0, body: e.message };
  }
}

// ===== PHASE C: REMINDER EMAILS =====

// Daily trigger function — scan CFR Bookings for trial classes tomorrow, send reminders
function _sendTrialReminders() {
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var tomorrowStr = Utilities.formatDate(tomorrow, CONFIG.TIMEZONE, 'yyyy-MM-dd');

  // Fetch template once for all emails in this run
  var template = _getDocTemplate(CONFIG.TRIAL_REMINDER_DOC_ID);

  var sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Bookings');
  var rows  = sheet.getDataRange().getValues();

  rows.slice(1).forEach(function(row) {
    var classType = row[2];
    var rawDate   = row[6];
    var dateStr   = (rawDate instanceof Date)
      ? Utilities.formatDate(rawDate, CONFIG.TIMEZONE, 'yyyy-MM-dd')
      : String(rawDate);
    var status    = row[27];
    var email     = row[13];
    var lastName  = row[11];
    var firstName = row[12];
    var timeStart = row[7];

    if (classType === 'trial' && dateStr === tomorrowStr && status === 'confirmed' && email) {
      _sendTrialReminderEmail({
        email: email, lastName: String(lastName), firstName: String(firstName),
        date: tomorrowStr, time: String(timeStart),
      }, template);
    }
  });
}

// Daily trigger function — scan CFR Bookings for foundation classes tomorrow, send reminders
function _sendFoundationReminders() {
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var tomorrowStr = Utilities.formatDate(tomorrow, CONFIG.TIMEZONE, 'yyyy-MM-dd');

  // Fetch template once for all emails in this run
  var template = _getDocTemplate(CONFIG.FOUNDATION_REMINDER_DOC_ID);

  var sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Bookings');
  var rows  = sheet.getDataRange().getValues();

  rows.slice(1).forEach(function(row) {
    var classType = row[2];
    var rawDate   = row[6];
    var dateStr   = (rawDate instanceof Date)
      ? Utilities.formatDate(rawDate, CONFIG.TIMEZONE, 'yyyy-MM-dd')
      : String(rawDate);
    var status    = row[27];
    var email     = row[13];
    var lastName  = row[11];
    var firstName = row[12];
    var timeStart = row[7];

    if (classType === 'foundation' && dateStr === tomorrowStr && status === 'confirmed' && email) {
      _sendFoundationReminderEmail({
        email: email, lastName: String(lastName), firstName: String(firstName),
        date: tomorrowStr, time: String(timeStart),
      }, template);
    }
  });
}

// d: { email, lastName, firstName, date, time }
// templateText: pre-fetched Google Doc text (optional — fetched if not provided)
// Available placeholders: {{LAST_NAME}} {{FIRST_NAME}} {{DATE_JP}} {{DATE_EN}} {{DATE}} {{TIME}}
function _sendTrialReminderEmail(d, templateText) {
  var dateParsed = new Date(d.date + 'T00:00:00+09:00');
  var dateJP = Utilities.formatDate(dateParsed, CONFIG.TIMEZONE, 'yyyy年M月d日');
  var dateEN = Utilities.formatDate(dateParsed, CONFIG.TIMEZONE, 'MMMM d, yyyy');

  var tmpl = templateText || _getDocTemplate(CONFIG.TRIAL_REMINDER_DOC_ID);
  var body = tmpl
    .replace(/\{\{LAST_NAME\}\}/g,  d.lastName)
    .replace(/\{\{FIRST_NAME\}\}/g, d.firstName)
    .replace(/\{\{DATE_JP\}\}/g,    dateJP)
    .replace(/\{\{DATE_EN\}\}/g,    dateEN)
    .replace(/\{\{DATE\}\}/g,       d.date)
    .replace(/\{\{TIME\}\}/g,       d.time);

  _emailCustomer(
    d.email,
    'CrossFit Roppongi | 明日の体験レッスンについて / Trial Class Reminder — ' + d.date,
    body
  );
}

// d: { email, lastName, firstName, date, time }
// templateText: pre-fetched Google Doc text (optional — fetched if not provided)
// Available placeholders: {{LAST_NAME}} {{FIRST_NAME}} {{DATE_JP}} {{DATE_EN}} {{DATE}} {{TIME}}
function _sendFoundationReminderEmail(d, templateText) {
  var dateParsed = new Date(d.date + 'T00:00:00+09:00');
  var dateJP = Utilities.formatDate(dateParsed, CONFIG.TIMEZONE, 'yyyy年M月d日');
  var dateEN = Utilities.formatDate(dateParsed, CONFIG.TIMEZONE, 'MMMM d, yyyy');

  var tmpl = templateText || _getDocTemplate(CONFIG.FOUNDATION_REMINDER_DOC_ID);
  var body = tmpl
    .replace(/\{\{LAST_NAME\}\}/g,  d.lastName)
    .replace(/\{\{FIRST_NAME\}\}/g, d.firstName)
    .replace(/\{\{DATE_JP\}\}/g,    dateJP)
    .replace(/\{\{DATE_EN\}\}/g,    dateEN)
    .replace(/\{\{DATE\}\}/g,       d.date)
    .replace(/\{\{TIME\}\}/g,       d.time);

  _emailCustomer(
    d.email,
    'CrossFit Roppongi | 明日のファウンデーションプログラムについて / Foundation Reminder — ' + d.date,
    body
  );
}

// ===== TEST BOOKING (no payment) =====
function _testCreateBooking(params) {
  var class_type       = params.class_type        || 'trial';
  var class_date       = params.class_date        || Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
  var class_time_start = params.class_time_start  || '10:00';
  var duration         = parseInt(params.duration || '60', 10);
  var class_time_end   = params.class_time_end    || (function() {
    var p = class_time_start.split(':').map(Number);
    var m = p[0] * 60 + p[1] + duration;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  })();
  var coach            = params.coach             || '';
  var customer_last    = params.last_name         || 'テスト';
  var customer_first   = params.first_name        || 'ユーザー';
  var email            = params.email             || 'test@crossfitroppongi.com';
  var phone            = params.phone             || '09000000000';
  var dob              = params.dob               || '1990-01-01';
  var gender           = params.gender            || 'male';
  var address          = params.address           || '';
  var lead_source      = params.lead_source       || 'Other';
  var price            = params.price             || '0';

  var class_name_en = CONFIG.CLASS_NAME_EN[class_type] || class_type;
  var class_name_jp = CONFIG.CLASS_NAME_JP[class_type] || class_type;
  var catalog_obj   = CONFIG.CATALOG[class_type]       || '';

  // Fake payment variables — skip Square entirely
  var squareCustomerId = 'TEST';
  var squareOrderId    = '';
  var squarePaymentId  = 'TEST';
  var paymentMethod    = 'test';
  var usedCreditId     = '';

  // Step 3: Generate booking ID
  var bookingId = _generateBookingId();

  // Step 4: Calendar reservation event
  var reservationEvent = _addReservationEvent({
    booking_id:       bookingId,
    class_name_en:    class_name_en,
    customer_last:    customer_last,
    customer_first:   customer_first,
    email:            email,
    phone:            phone,
    class_date:       class_date,
    class_time_start: class_time_start,
    class_time_end:   class_time_end,
    class_type:       class_type,
    duration:         duration,
  });
  var _colorMap = {
    'drop_in': CalendarApp.EventColor.CYAN, 'open_gym': CalendarApp.EventColor.CYAN,
    'hyrox_strength': CalendarApp.EventColor.CYAN, 'trial': CalendarApp.EventColor.YELLOW,
    'spartan': CalendarApp.EventColor.BLUE, 'hyrox_performance': CalendarApp.EventColor.BLUE,
    'foundation': CalendarApp.EventColor.TEAL,
  };
  var _evColor = _colorMap[class_type];
  if (_evColor && reservationEvent) reservationEvent.setColor(_evColor);

  // Step 5: Calendar quick-add link
  var calLink = _calendarAddLink(class_name_en, class_date, class_time_start, class_time_end);

  // Step 6: Log to sheet
  _logBooking({
    booking_id: bookingId, class_type: class_type,
    class_name_en: class_name_en, class_name_jp: class_name_jp, coach: coach,
    class_date: class_date, class_time_start: class_time_start, class_time_end: class_time_end,
    duration: duration, calendar_event_id: '',
    customer_last: customer_last, customer_first: customer_first,
    customer_email: email, customer_phone: phone, customer_address: address,
    customer_dob: dob, customer_gender: gender,
    square_customer_id: squareCustomerId, square_order_id: squareOrderId,
    square_payment_id: squarePaymentId, catalog_object_id: catalog_obj,
    price: price, payment_method: paymentMethod,
    used_credit: false, credit_id: usedCreditId,
    lead_source: lead_source, status: 'confirmed',
    calendar_link: calLink, notes: 'TEST BOOKING — DO NOT COUNT',
  });

  // Step 6b: Wodify lead sync
  var wodifyResult = {};
  try {
    var _wr = _syncWodifyLead({ email: email, first_name: customer_first, last_name: customer_last,
                                phone: phone, lead_source: lead_source, class_type: class_type });
    _updateBookingWodifyResult(bookingId, _wr.status, new Date().toISOString(), _wr.wodify_lead_id || '');
    wodifyResult = _wr;
  } catch(e) {
    wodifyResult = { success: false, error: e.message };
    _updateBookingWodifyResult(bookingId, 'error', new Date().toISOString(), '');
  }

  // Step 6c: Wodify placeholder reservation
  var _wPlaceholderIds = null;
  var _wCtNorm = class_type.replace(/_/g, '');
  if (_wCtNorm === 'trial')                                                                 _wPlaceholderIds = CONFIG.WODIFY_TRIAL_CLIENT_IDS;
  else if (_wCtNorm === 'dropin' || _wCtNorm === 'opengym' || _wCtNorm === 'hyroxstrength') _wPlaceholderIds = CONFIG.WODIFY_DROPIN_CLIENT_IDS;

  if (_wPlaceholderIds && _wPlaceholderIds.length > 0) {
    try {
      var _slotIdx        = _countSlotBookings(class_type, class_date, class_time_start) - 1;
      var _wPlaceholderId = _wPlaceholderIds[_slotIdx];
      wodifyResult.placeholder_id    = _wPlaceholderId || 'none (overflow)';
      wodifyResult.placeholder_index = _slotIdx;
      if (_wPlaceholderId) {
        var _startISO = class_date + 'T' + class_time_start + ':00' + CONFIG.JST_OFFSET;
        wodifyResult.start_iso_built  = _startISO;
        wodifyResult.target_ms        = new Date(_startISO).getTime();
        wodifyResult.last_page        = _findWodifyLastPage();
        var _wClassId = _findWodifyClassByDateTime(_startISO);
        wodifyResult.class_id = _wClassId || null;
        if (_wClassId) {
          var _reserveResult = _reserveWodifyClass(_wPlaceholderId, _wClassId);
          wodifyResult.reserve_code    = _reserveResult.code;
          wodifyResult.reserve_success = _reserveResult.success;
          wodifyResult.reserve_body    = _reserveResult.body;
        }
      }
    } catch(e) { wodifyResult.reservation_error = e.message; }
  }

  // Step 7: Emails
  _sendBookingAdminNotification({
    bookingId: bookingId, class_name_en: class_name_en, class_name_jp: class_name_jp,
    class_date: class_date, class_time_start: class_time_start, coach: coach,
    customer_last: customer_last, customer_first: customer_first,
    email: email, phone: phone, dob: dob, gender: gender, address: address,
    paymentMethod: paymentMethod, squareOrderId: squareOrderId, price: price,
    notes: 'TEST BOOKING — DO NOT COUNT', pack: 'single', usedCreditId: '',
  });
  if (email) {
    _sendBookingConfirmation({
      bookingId: bookingId, class_name_en: class_name_en, class_name_jp: class_name_jp,
      class_date: class_date, class_time_start: class_time_start, class_time_end: class_time_end,
      duration: duration, coach: coach,
      customer_last: customer_last, customer_first: customer_first,
      email: email, phone: phone, paymentMethod: paymentMethod,
      price: price, calLink: calLink, pack: 'single', newCreditId: '',
      has_coach: coach !== '',
    });
  }

  // Step 8: Cache invalidation
  var _ct = class_type.toLowerCase().replace(/_/g, '');
  var _dp = class_date.split('-');
  _cacheDelete('avail_' + _ct + '_' + class_date);
  _cacheDelete('upcoming_' + _ct);
  if (_dp.length === 3) {
    _cacheDelete('month_' + _ct + '_' + _dp[0] + '_' + parseInt(_dp[1], 10));
    if (_ct === 'dropin' || _ct === 'opengym') {
      _cacheDelete('avail_dropin_' + class_date); _cacheDelete('avail_opengym_' + class_date);
      _cacheDelete('month_dropin_' + _dp[0] + '_' + parseInt(_dp[1], 10));
      _cacheDelete('month_opengym_' + _dp[0] + '_' + parseInt(_dp[1], 10));
    }
  }

  return _ok({
    booking_id:    bookingId,
    calendar_link: calLink,
    wodify:        wodifyResult,
    note:          'TEST BOOKING — delete row from CFR Bookings sheet and event from Calendar when done',
  });
}

// ===== CACHE STATUS DIAGNOSTIC =====
// Diagnostic: list all Wodify clients (paginated) — used to find placeholder client IDs
// Usage: ?action=listWodifyClients
function _listWodifyClients() {
  var all = [];
  var page = 1;
  while (true) {
    var res  = UrlFetchApp.fetch(
      CONFIG.WODIFY_BASE_URL + '/clients?page=' + page + '&page_size=100',
      { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
    );
    var data    = JSON.parse(res.getContentText());
    var clients = data.clients || [];
    for (var i = 0; i < clients.length; i++) {
      all.push({ id: clients[i].id, name: (clients[i].first_name || '') + ' ' + (clients[i].last_name || '') });
    }
    if (!data.pagination || !data.pagination.has_more) break;
    page++;
  }
  all.sort(function(a, b) { return a.name.localeCompare(b.name); });
  return _ok({ count: all.length, clients: all });
}

// Diagnostic: list recent/upcoming Wodify classes — verify start_date_time format.
// Fetches page 1 to estimate total, then reads the last 3 pages (most recent classes).
// Usage: ?action=listWodifyClasses            — returns last 3 pages (most recent ~300 classes)
//        ?action=listWodifyClasses&page=200   — returns that specific page
function _listWodifyClasses(pageParam, dateParam) {
  var all = [];

  if (dateParam) {
    // Wodify /classes API ignores all date-filter params; start_date_time is non-monotonic
    // across pages (classes are batched by program). Use PropertiesService cache instead.
    // Wodify keys are JST naive with Z suffix — date prefix IS the JST date, so string match is correct.
    var cacheJson  = PropertiesService.getScriptProperties().getProperty('WODIFY_CLASS_CACHE');
    var cacheBuilt = PropertiesService.getScriptProperties().getProperty('WODIFY_CLASS_CACHE_BUILT') || 'not built';
    if (cacheJson) {
      var cache = JSON.parse(cacheJson);
      Object.keys(cache).forEach(function(k) {
        if (k.substring(0, 10) === dateParam) {
          var val = cache[k];
          all.push({ id: val.id || val, start_date_time: k, program: val.program || '' });
        }
      });
      all.sort(function(a, b) { return a.start_date_time > b.start_date_time ? 1 : -1; });
      return _ok({ date: dateParam, count: all.length, classes: all, cache_built: cacheBuilt });
    }
    return _ok({ date: dateParam, count: 0, classes: [],
                 error: 'Cache not built. Run ?action=buildWodifyCache (or _buildWodifyClassCache() from IDE).' });
  }

  if (pageParam) {
    // Specific page requested — return just that page for manual probing
    var pg   = parseInt(pageParam, 10);
    var data = JSON.parse(UrlFetchApp.fetch(
      CONFIG.WODIFY_BASE_URL + '/classes?page=' + pg + '&page_size=100',
      { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
    ).getContentText());
    var cls = data.classes || [];
    for (var i = 0; i < cls.length; i++) {
      all.push({ id: cls[i].id, start_date_time: cls[i].start_date_time,
                 program: cls[i].program_name || cls[i].program || '' });
    }
    return _ok({ page: pg, pagination_meta: data.pagination || {}, count: all.length, classes: all });
  }

  // No params — return last 3 pages (most recently created classes)
  var lastPage = _findWodifyLastPage();
  var startPg  = Math.max(1, lastPage - 2);
  for (var p = startPg; p <= lastPage; p++) {
    var res = JSON.parse(UrlFetchApp.fetch(
      CONFIG.WODIFY_BASE_URL + '/classes?page=' + p + '&page_size=100',
      { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
    ).getContentText());
    var classes = res.classes || [];
    for (var i = 0; i < classes.length; i++) {
      all.push({ id: classes[i].id, start_date_time: classes[i].start_date_time,
                 program: classes[i].program_name || classes[i].program || '' });
    }
  }
  all.sort(function(a, b) { return a.start_date_time > b.start_date_time ? 1 : -1; });
  return _ok({ last_page: lastPage, start_page: startPg, count: all.length, classes: all });
}

// Diagnostic: probe Wodify /leads — search + dry-run create to expose API response structure.
// Usage: ?action=probeWodifyLeads&email=someone@example.com
function _probeWodifyLeads(params) {
  var email = params.email || '';
  var results = {};

  // 1. Search
  var searchRes = UrlFetchApp.fetch(
    CONFIG.WODIFY_BASE_URL + '/leads' + (email ? '?email=' + encodeURIComponent(email) : ''),
    { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
  );
  results.search = { code: searchRes.getResponseCode(), body: JSON.parse(searchRes.getContentText()) };

  // 2. Dry-run create — shows exact error (payload, auth, duplicate, etc.)
  if (email) {
    var payload = {
      location_id: CONFIG.WODIFY_LOCATION_ID,
      first_name:  'Test',
      last_name:   'Lead',
      email:       email,
    };
    var createRes = UrlFetchApp.fetch(CONFIG.WODIFY_BASE_URL + '/leads', {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify(payload),
      headers: { 'x-api-key': CONFIG.WODIFY_API_KEY },
      muteHttpExceptions: true,
    });
    results.create_attempt = { code: createRes.getResponseCode(), body: JSON.parse(createRes.getContentText()) };
  }

  return _ok(results);
}

// Diagnostic: probe which date-filter parameter Wodify's /classes endpoint accepts.
// Usage: ?action=probeWodifyDateFilter&date=2026-05-08
function _probeWodifyDateFilter(dateStr) {
  if (!dateStr) return _err('date parameter required (YYYY-MM-DD)');
  var results = {};
  var params = [
    'start_date=' + dateStr + '&end_date=' + dateStr,
    'date_from='  + dateStr + '&date_to='  + dateStr,
    'date='       + dateStr,
    'schedule_date=' + dateStr,
  ];
  params.forEach(function(p) {
    try {
      var res  = UrlFetchApp.fetch(
        CONFIG.WODIFY_BASE_URL + '/classes?' + p + '&page_size=100',
        { headers: { 'x-api-key': CONFIG.WODIFY_API_KEY }, muteHttpExceptions: true }
      );
      var data = JSON.parse(res.getContentText());
      results[p] = {
        http_code: res.getResponseCode(),
        count:     (data.classes || []).length,
        sample:    (data.classes || []).slice(0, 3).map(function(c) {
          return { id: c.id, start_date_time: c.start_date_time, program: c.program_name || c.program || '' };
        }),
      };
    } catch(e) { results[p] = { error: e.message }; }
  });
  return _ok({ date_tested: dateStr, results: results });
}

function _getCacheStatus() {
  var keys = [];
  var now = new Date();
  var m1 = now.getMonth() + 1, y1 = now.getFullYear();
  var m2 = m1 === 12 ? 1 : m1 + 1, y2 = m1 === 12 ? y1 + 1 : y1;
  ['dropin', 'opengym', 'trial'].forEach(function(ct) {
    keys.push('month_' + ct + '_' + y1 + '_' + m1);
    keys.push('month_' + ct + '_' + y2 + '_' + m2);
  });
  ['hyroxperformance', 'hyroxstrength', 'spartan', 'foundation'].forEach(function(ct) {
    keys.push('upcoming_' + ct);
  });
  for (var d = 0; d < 7; d++) {
    var day = new Date(now);
    day.setDate(day.getDate() + d);
    var ds = Utilities.formatDate(day, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    ['dropin', 'opengym', 'trial'].forEach(function(ct) {
      keys.push('avail_' + ct + '_' + ds);
    });
  }
  var cache = CacheService.getScriptCache();
  var status = {};
  keys.forEach(function(k) {
    var v = cache.get(k);
    status[k] = v ? 'HIT (' + v.length + ' bytes)' : 'MISS';
  });
  var triggers = ScriptApp.getProjectTriggers().map(function(t) { return t.getHandlerFunction(); });
  status['_trigger_warmCache']                  = triggers.indexOf('_warmCache')                  >= 0 ? 'EXISTS' : 'MISSING — run _setupAllTriggers()';
  status['_trigger_updateWodifyClassCache']      = triggers.indexOf('_updateWodifyClassCache')      >= 0 ? 'EXISTS' : 'MISSING — run _setupAllTriggers()';
  status['_trigger_enrichWodifyTrialCache']      = triggers.indexOf('_enrichWodifyTrialCache')      >= 0 ? 'EXISTS' : 'MISSING — run _setupAllTriggers()';
  status['_trigger_sendTrialReminders']          = triggers.indexOf('_sendTrialReminders')          >= 0 ? 'EXISTS' : 'MISSING';
  status['_trigger_sendFoundationReminders']     = triggers.indexOf('_sendFoundationReminders')     >= 0 ? 'EXISTS' : 'MISSING';
  return _ok(status);
}

// ===== CACHE WARMING — run _setupAllTriggers() once from Apps Script IDE =====
function _warmCache() {
  var now = new Date();
  var m1 = now.getMonth() + 1, y1 = now.getFullYear();
  var m2 = m1 === 12 ? 1 : m1 + 1, y2 = m1 === 12 ? y1 + 1 : y1;
  // Month grid (current + next month) — no pre-delete; _cacheSet overwrites
  ['dropin', 'opengym', 'trial'].forEach(function(ct) {
    _getMonthAvailability({ year: String(y1), month: String(m1), classType: ct });
    _getMonthAvailability({ year: String(y2), month: String(m2), classType: ct });
  });
  // Upcoming list (HYROX / Spartan / Foundation) — no pre-delete
  ['hyroxperformance', 'hyroxstrength', 'spartan', 'foundation'].forEach(function(ct) {
    _getUpcomingClasses({ classType: ct, limit: '20', offset: '0' });
  });
  // Daily availability for next 14 days (trial / dropin / opengym)
  // Skip today (_d starts at 1) — same-day availability is always computed fresh
  // so booking cutoffs are evaluated with current Date.now()
  var _dailyTypes = ['dropin', 'opengym', 'trial'];
  for (var _d = 1; _d < 14; _d++) {
    var _day = new Date(now);
    _day.setDate(_day.getDate() + _d);
    var _dateStr = Utilities.formatDate(_day, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    _dailyTypes.forEach(function(ct) {
      _getAvailability({ date: _dateStr, classType: ct });
    });
  }
}

// Run ONCE from Apps Script IDE after Phase C deploy (replaces _setupCacheTriggers)
function _setupAllTriggers() {
  // Remove existing managed triggers
  ScriptApp.getProjectTriggers().forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === '_warmCache' || fn === '_sendTrialReminders' || fn === '_sendFoundationReminders' ||
        fn === '_buildWodifyClassCache' || fn === '_updateWodifyClassCache' || fn === '_enrichWodifyTrialCache') {
      ScriptApp.deleteTrigger(t);
    }
  });
  // Availability cache warm every 4 hours (skips same-day — always computed fresh)
  ScriptApp.newTrigger('_warmCache').timeBased().everyHours(4).create();
  // Wodify class cache — daily incremental update at 3:00am JST
  ScriptApp.newTrigger('_updateWodifyClassCache').timeBased().everyDays(1).atHour(3).inTimezone(CONFIG.TIMEZONE).create();
  // Wodify trial enrichment — daily at 3:30am JST (after class cache update)
  ScriptApp.newTrigger('_enrichWodifyTrialCache').timeBased().everyDays(1).atHour(3).nearMinute(30).inTimezone(CONFIG.TIMEZONE).create();
  // Daily reminder emails at 9am JST
  ScriptApp.newTrigger('_sendTrialReminders').timeBased().everyDays(1).atHour(9).inTimezone(CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('_sendFoundationReminders').timeBased().everyDays(1).atHour(9).inTimezone(CONFIG.TIMEZONE).create();
}

// ===== ONE-TIME SETUP — run manually from Apps Script editor =====
function setupSheetHeaders() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEETS_ID);

  var bookings = ss.getSheetByName('CFR Bookings');
  if (bookings && bookings.getLastRow() === 0) {
    bookings.appendRow([
      'booking_id','created_at','class_type','class_name_en','class_name_jp',
      'coach','class_date','class_time_start','class_time_end','duration',
      'calendar_event_id','customer_last','customer_first','customer_email',
      'customer_phone','customer_address','customer_dob','customer_gender',
      'square_customer_id','square_order_id','square_payment_id',
      'catalog_object_id','price','payment_method',
      'used_credit','credit_id','lead_source','status','calendar_link','notes',
      'lead_status','sync_timestamp','wodify_lead_id',
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