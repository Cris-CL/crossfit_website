// CrossFit Roppongi — Apps Script Web App
// Handles: class availability, credits, bookings, contact form, career form
// All email via GmailApp — no external form services

// ===== CONFIGURATION =====
var CONFIG = {
  SHEETS_ID:             '1pNDApfzNDPUx36DuNScxI0kDIRF1NaEgcUrZi4n8Pac',
  CALENDAR_SCHEDULE:     'c_96a7c8918d366b36d5a653ea46c7bb3478e719c18a158885a2ac243e8887728b@group.calendar.google.com',
  CALENDAR_RESERVATIONS: 'c_8fc3731011a121e80791665e359fb142546cb215d525aae1efd4bce6e4f18817@group.calendar.google.com',
  SQUARE_ACCESS_TOKEN:   'EAAAljgcYGVStuET69QZYwevLrXJBg4Vlc4M0RdoVVDdsK6GjMnYEhmp4bks0yED',
  SQUARE_APP_ID:         'sq0idp-eChh4aLkTbdSX1wjBkUjbA',
  SQUARE_LOCATION_ID:    'LS9F1QVWR4QQ7',
  SQUARE_BASE_URL:       'https://connect.squareup.com/v2',
  SQUARE_VERSION:        '2024-07-17',
  CATALOG: {
    spartan:           'L2ZK4LQ4NSHSNUMZT4KUKX6F',
    dropin:            '5YKJST77W7HJHO45LVB6UCYR',
    hyrox_performance: 'AC6F2TS26EFKPNHNTR4GYQ63',
    hyrox_strength:    'FKFEI77GZUVRWKPNOXET7ZEL',
    trial:             'PD3PXMJ5VQVEOMORKXEDATR3',
  },
  CATALOG_LABELS: {
    spartan:           'Spartan Training',
    dropin:            'Drop In',
    hyrox_performance: 'HYROX Race Performance',
    hyrox_strength:    'HYROX Strength & Conditioning',
    trial:             'Trial Class',
  },
  ADMIN_PASSWORD:        'gBaN0EP8XBjuA8P',
  CLASS_CAPACITY:        15,
  TIMEZONE:              'Asia/Tokyo',
  GYM_NAME:              'CrossFit Roppongi',
  GYM_EMAIL:             'bookings@crossfitroppongi.com',
  STAFF_EMAILS:          'alvaroaltamirano@crossfitroppongi.com, tsujimoto@crossfitroppongi.com, bruce@crossfitroppongi.com, bookings@crossfitroppongi.com, sato@crossfitroppongi.com',
  GYM_SIGNATURE:         '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\nCrossFit Roppongi\n\u3012106-0032 \u6771\u4eac\u90fd\u6e2f\u533a\u516d\u672c\u6728\uff17\uff0d\uff14\uff0d\uff18 \u30a6\u30a4\u30f3\u30c9\u30d3\u30eb B1F\nB1 Wind Building, 7-4-8 Roppongi, Minato-ku, Tokyo 106-0032, Japan\nTEL\uff1a03-6438-9813\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501',
};

// ===== RESPONSE HELPERS =====
function _json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
function _ok(data)    { return _json(Object.assign({ success: true }, data || {})); }
function _err(msg)    { return _json({ success: false, message: msg }); }

// ===== ROUTER =====
function doGet(e) {
  try {
    var action = e.parameter.action;
    if (action === 'availability')       return _getAvailability(e.parameter);
    if (action === 'monthAvailability')  return _getMonthAvailability(e.parameter);
    if (action === 'checkCredits')       return _getCheckCredits(e.parameter);
    return _err('Unknown action: ' + action);
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
    if (action === 'useCreditFrontDesk') return _postUseCreditFrontDesk(body);
    if (action === 'submitContactForm')  return _postSubmitContactForm(body);
    if (action === 'submitCareerForm')   return _postSubmitCareerForm(body);
    return _err('Unknown action: ' + action);
  } catch (ex) {
    console.error('doPost error', ex);
    return _err(ex.message || 'Server error');
  }
}

// ===== GET: AVAILABILITY =====
// ?action=availability&date=2026-03-16
function _getAvailability(params) {
  var date = params.date;
  if (!date) return _err('date parameter required (YYYY-MM-DD)');

  var parts = date.split('-').map(Number);
  var start = new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0);
  var end   = new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59);

  var scheduleCal    = CalendarApp.getCalendarById(CONFIG.CALENDAR_SCHEDULE);
  var reservationCal = CalendarApp.getCalendarById(CONFIG.CALENDAR_RESERVATIONS);
  var classEvents    = scheduleCal.getEvents(start, end);

  var slots = classEvents.map(function(event) {
    var slotStart = event.getStartTime();
    var slotEnd   = event.getEndTime();

    // Count reservations matching this exact slot (1-minute tolerance)
    var reservations = reservationCal.getEvents(slotStart, slotEnd).filter(function(r) {
      return Math.abs(r.getStartTime().getTime() - slotStart.getTime()) < 60000;
    });

    var booked = reservations.length;
    return {
      title:        event.getTitle(),
      start_iso:    slotStart.toISOString(),
      end_iso:      slotEnd.toISOString(),
      time_display: Utilities.formatDate(slotStart, CONFIG.TIMEZONE, 'HH:mm'),
      capacity:     CONFIG.CLASS_CAPACITY,
      booked:       booked,
      available:    Math.max(0, CONFIG.CLASS_CAPACITY - booked),
    };
  });

  return _ok({ date: date, slots: slots });
}

// ===== GET: MONTH AVAILABILITY =====
// ?action=monthAvailability&year=2026&month=3
function _getMonthAvailability(params) {
  var year  = parseInt(params.year,  10);
  var month = parseInt(params.month, 10); // 1-based
  if (!year || !month) return _err('year and month parameters required');

  var start = new Date(year, month - 1, 1, 0, 0, 0);
  var end   = new Date(year, month, 0, 23, 59, 59); // last day of month

  var events  = CalendarApp.getCalendarById(CONFIG.CALENDAR_SCHEDULE).getEvents(start, end);
  var dateSet = {};
  events.forEach(function(ev) {
    var d = Utilities.formatDate(ev.getStartTime(), CONFIG.TIMEZONE, 'yyyy-MM-dd');
    dateSet[d] = true;
  });

  return _ok({ year: year, month: month, availableDates: Object.keys(dateSet).sort() });
}

// ===== GET: CHECK CREDITS =====
// ?action=checkCredits&email=xxx@example.com
function _getCheckCredits(params) {
  var email = (params.email || '').trim().toLowerCase();
  if (!email) return _err('email parameter required');

  var sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Credits');
  var data  = sheet.getDataRange().getValues();

  // Columns: 0=email, 1=name, 2=credits, 3=last_updated
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === email) {
      return _ok({
        email:        data[i][0],
        name:         data[i][1],
        credits:      Number(data[i][2]),
        last_updated: data[i][3],
      });
    }
  }
  return _ok({ email: email, credits: 0 });
}

// ===== POST: SEARCH SQUARE CUSTOMER =====
function _postSearchCustomer(body) {
  var email = body.email;
  var phone = body.phone;
  if (!email && !phone) return _err('email or phone required');

  var filter = email
    ? { emailAddress: { exact: email } }
    : { phoneNumber: { exact: phone } };

  var result = _squareRequest('POST', '/customers/search', { query: { filter: filter } });
  if (result.errors) return _err(result.errors[0].detail || 'Square API error');

  var customers = result.customers || [];
  if (customers.length === 0) return _ok({ found: false });

  var c = customers[0];
  return _ok({
    found: true,
    customer: {
      id:            c.id,
      given_name:    c.given_name,
      family_name:   c.family_name,
      email_address: c.email_address,
      phone_number:  c.phone_number,
    },
  });
}

// ===== POST: CREATE BOOKING =====
function _postCreateBooking(body) {
  var sourceId          = body.sourceId          || '';
  var verificationToken = body.verificationToken || '';
  var booking_type      = body.booking_type      || 'spartan';
  var first_name        = body.first_name        || '';
  var last_name         = body.last_name         || '';
  var sei               = body.sei               || '';
  var mei               = body.mei               || '';
  var email             = body.email             || '';
  var phone             = body.phone             || '';
  var dob               = body.dob               || '';
  var sex               = body.sex               || '';
  var address           = body.address           || '';
  var country           = body.country           || '';
  var postal_code       = body.postal_code       || '';
  var notes             = body.notes             || '';
  var class_iso         = body.class_iso         || '';
  var class_date        = body.class_date        || '';
  var class_time        = body.class_time        || '';
  var class_display     = body.class_display     || '';
  var use_credit        = body.use_credit === true;

  if (!class_iso || !class_date || !class_time) return _err('Class selection is required.');
  if (!sex)  return _err('\u6027\u5225 (Sex) is required.');
  if (!dob)  return _err('\u751f\u5e74\u6708\u65e5 (Date of Birth) is required.');

  var buyerName     = [first_name, last_name].filter(Boolean).join(' ') || 'Athlete';
  var classLabel    = CONFIG.CATALOG_LABELS[booking_type] || booking_type;
  var squareOrderId = null;
  var paymentMethod = 'credit';

  if (use_credit) {
    var creditResult = _deductCredit(email, buyerName);
    if (!creditResult.success) return _err(creditResult.message);
  } else {
    if (!sourceId) return _err('Payment token (sourceId) is missing.');

    var variationId = CONFIG.CATALOG[booking_type];
    if (!variationId) return _err('Invalid booking type: ' + booking_type);

    // Create Square Order
    var orderResult = _squareRequest('POST', '/orders', {
      idempotencyKey: _uuid(),
      order: {
        locationId: CONFIG.SQUARE_LOCATION_ID,
        lineItems: [{ catalogObjectId: variationId, quantity: '1' }],
      },
    });
    if (orderResult.errors) return _err(orderResult.errors[0].detail || 'Order creation failed');
    squareOrderId = orderResult.order.id;
    var amountMoney = orderResult.order.totalMoney;

    // Create Square Payment
    var paymentBody = {
      sourceId:       sourceId,
      idempotencyKey: _uuid(),
      amountMoney:    amountMoney,
      orderId:        squareOrderId,
      locationId:     CONFIG.SQUARE_LOCATION_ID,
      note:           classLabel + ' ' + class_date + ' ' + class_time + ' \u2014 ' + buyerName,
    };
    if (verificationToken) paymentBody.verificationToken = verificationToken;

    var paymentResult = _squareRequest('POST', '/payments', paymentBody);
    if (paymentResult.errors) return _err(paymentResult.errors[0].detail || 'Payment failed');
    paymentMethod = 'square_payment';
  }

  // Log to sheet
  _logBooking({
    booking_type: booking_type, class_iso: class_iso, class_date: class_date,
    class_time: class_time, class_display: class_display,
    first_name: first_name, last_name: last_name, sei: sei, mei: mei,
    email: email, phone: phone, dob: dob, sex: sex,
    country: country, address: address, postal_code: postal_code, notes: notes,
    payment_method: paymentMethod, square_order_id: squareOrderId || '', status: 'confirmed',
  });

  // Add to Reservations calendar
  _addReservationEvent({
    class_iso: class_iso, class_time: class_time, class_display: class_display,
    booking_type: booking_type, buyerName: buyerName, email: email, phone: phone,
  });

  // Admin notification email
  _emailAdmin(
    '[Booking] ' + classLabel + ' ' + class_date + ' ' + class_time + ' \u2014 ' + buyerName,
    _bookingAdminBody({
      classLabel: classLabel, class_date: class_date, class_time: class_time,
      buyerName: buyerName, sei: sei, mei: mei, email: email, phone: phone,
      dob: dob, sex: sex, country: country, address: address, postal_code: postal_code,
      notes: notes, payment_method: paymentMethod, square_order_id: squareOrderId || '',
    })
  );

  // Customer confirmation email
  if (email) {
    _emailCustomer(
      email,
      '\u4e88\u7d04\u78ba\u8a8d | Booking Confirmed \u2014 ' + CONFIG.GYM_NAME,
      _bookingCustomerBody({ classLabel: classLabel, class_date: class_date, class_time: class_time, buyerName: buyerName })
    );
  }

  return _ok({ message: 'Booking confirmed' });
}

// ===== POST: USE CREDIT (FRONT DESK) =====
function _postUseCreditFrontDesk(body) {
  if (body.adminPassword !== CONFIG.ADMIN_PASSWORD) return _err('Unauthorized');

  var email         = body.email         || '';
  var name          = body.name          || email;
  var booking_type  = body.booking_type  || 'dropin';
  var class_iso     = body.class_iso     || '';
  var class_date    = body.class_date    || '';
  var class_time    = body.class_time    || '';
  var class_display = body.class_display || '';

  if (!email)     return _err('Customer email required');
  if (!class_iso) return _err('Class selection required');

  var creditResult = _deductCredit(email, name);
  if (!creditResult.success) return _err(creditResult.message);

  var classLabel = CONFIG.CATALOG_LABELS[booking_type] || booking_type;

  _logBooking({
    booking_type: booking_type, class_iso: class_iso, class_date: class_date,
    class_time: class_time, class_display: class_display,
    first_name: name, last_name: '', sei: '', mei: '',
    email: email, phone: '', dob: '', sex: '', country: '', address: '', postal_code: '',
    notes: 'Front desk credit use', payment_method: 'credit', square_order_id: '', status: 'confirmed',
  });

  _addReservationEvent({
    class_iso: class_iso, class_time: class_time, class_display: class_display,
    booking_type: booking_type, buyerName: name, email: email, phone: '',
  });

  _emailAdmin(
    '[Front Desk] Credit used \u2014 ' + name + ' (' + classLabel + ' ' + class_date + ')',
    'Front desk credit deduction.\n\nCustomer : ' + name + '\nEmail    : ' + email +
    '\nClass    : ' + classLabel + ' ' + class_date + ' ' + class_time +
    '\nCredits remaining: ' + creditResult.credits_remaining
  );

  return _ok({ message: 'Credit used', credits_remaining: creditResult.credits_remaining });
}

// ===== POST: CONTACT FORM =====
function _postSubmitContactForm(body) {
  var inquiryType    = body.inquiryType     || '';
  var name           = body.name            || '';
  var phone          = body.phone           || '';
  var email          = body.email           || '';
  var message        = body.message         || '';
  var acceptedPrivacy= body.acceptedPrivacy;
  var website        = body.website         || '';

  if (website) return _ok({}); // honeypot

  if (!inquiryType || !name || !phone || !email || !message) {
    return _err('Required fields are missing.');
  }
  if (!acceptedPrivacy) return _err('Privacy policy consent is required.');

  // Log to sheet
  _logForm('contact', { inquiryType: inquiryType, name: name, phone: phone, email: email, message: message });

  var div  = ' – – – – – – – ENGLISH – – – – – – –';
  var addr = '〒106-0032 東京都港区六本木７−４−８ ウインドビル B1F\nTEL：03-6438-9813\nこのメールは CrossFit Roppongi (crossfitroppongi.com) のお問い合わせフォームから送信されました';
  var addrEn = '〒106-0032 Tokyo, Minato-ku, Roppongi 7-4-8 Wind Building B1F, Japan\nTEL：03-6438-9813\nThis email was sent from the inquiry form of CrossFit Roppongi (crossfitroppongi.com)';

  // Admin notification → all staff; replyTo = customer email so staff can reply directly
  var adminBody =
    '※このメールはシステムから自動で送信されています。\n\n' +
    name + '様よりお問い合わせがありました。\n\n' +
    'お問い合わせ内容 ： ' + inquiryType + '\n' +
    '氏名 ： ' + name + '様\n' +
    '電話番号 : ' + phone + '\n' +
    'メールアドレス : ' + email + '\n' +
    'お問い合わせ詳細: ' + message + '\n\n' +
    'CrossFit Roppongi\n' +
    addr + '\n\n' +
    div + '\n\n' +
    '※This email has been sent automatically by the system.\n\n' +
    'An inquiry has been received from ' + name + '.\n\n' +
    'Inquiry Type: ' + inquiryType + '\n' +
    'Name: ' + name + '\n' +
    'Phone Number: ' + phone + '\n' +
    'Email Address: ' + email + '\n' +
    'Inquiry Details: ' + message + '\n\n' +
    'CrossFit Roppongi\n' +
    addrEn;

  GmailApp.sendEmail(
    CONFIG.STAFF_EMAILS,
    'CrossFit Roppongi | ' + inquiryType + ' | ' + name,
    adminBody,
    { name: CONFIG.GYM_NAME + ' Website', replyTo: email }
  );

  // Customer auto-reply
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
    'CrossFit Roppongi\n' +
    addr + '\n\n' +
    div + '\n\n' +
    '※This email has been sent automatically by the system.\n\n' +
    'Dear ' + name + ',\n\n' +
    'Thank you very much for contacting us.\n' +
    'A representative will review your inquiry and get back to you shortly.\n\n' +
    'If you do not receive a response within one week of your inquiry,\n' +
    'it is possible that we did not successfully receive your message.\n' +
    'We apologize for the inconvenience. Please reply to this email, and we will forward your message to the appropriate team.\n\n' +
    'Confirmation of your submitted information\n\n' +
    'Inquiry Type: ' + inquiryType + '\n' +
    'Name: ' + name + '\n' +
    'Phone Number: ' + phone + '\n' +
    'Email Address: ' + email + '\n' +
    'Inquiry Details: ' + message + '\n\n' +
    'If you received this email by mistake or do not recognize this inquiry, please contact us.\n' +
    'Thank you again for your inquiry.\n\n' +
    'CrossFit Roppongi\n' +
    addrEn;

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

  if (website) return _ok({}); // honeypot
  if (!name || !email || !message) return _err('Required fields are missing.');

  // Save resume to Google Drive first (so we have the URL for the sheet log)
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

  // Log to sheet (including file URL)
  _logForm('career', { name: name, email: email, phone: phone, position: position, birthday: birthday, gender: gender, fileName: fileName, driveUrl: driveUrl, message: message });

  var div    = ' – – – – – – – ENGLISH – – – – – – –';
  var addr   = '〒106-0032 東京都港区六本木７−４−８ ウインドビル B1F\nTEL：03-6438-9813\nこのメールは CrossFit Roppongi (crossfitroppongi.com) のお問い合わせフォームから送信されました';
  var addrEn = '〒106-0032 Tokyo, Minato-ku, Roppongi 7-4-8 Wind Building B1F, Japan\nTEL：03-6438-9813\nThis email was sent from the inquiry form of CrossFit Roppongi (crossfitroppongi.com)';
  var fileRef = driveUrl ? driveUrl : (fileName || '—');

  // Admin notification
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
    'CrossFit Roppongi\n' +
    addr + '\n\n' +
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
    'CrossFit Roppongi\n' +
    addrEn;

  _emailAdmin(
    'CrossFit Roppongi | ' + (position || 'General') + ' | ' + name,
    adminBody
  );

  // Applicant confirmation
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
    'CrossFit Roppongi\n' +
    addr + '\n\n' +
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
    'CrossFit Roppongi\n' +
    addrEn;

  _emailCustomer(
    email,
    'CrossFit Roppongi | ご応募ありがとうございます。(Thank you for your application)',
    customerBody
  );

  return _ok({});
}

// ===== PRIVATE HELPERS =====

function _deductCredit(email, name) {
  var sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Credits');
  var data  = sheet.getDataRange().getValues();
  var norm  = email.toLowerCase().trim();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase().trim() === norm) {
      var current = Number(data[i][2]);
      if (current < 1) return { success: false, message: 'No credits remaining for this customer.' };
      sheet.getRange(i + 1, 3).setValue(current - 1);
      sheet.getRange(i + 1, 4).setValue(new Date().toISOString());
      return { success: true, credits_remaining: current - 1 };
    }
  }
  return { success: false, message: 'Customer not found in credits ledger.' };
}

function _logBooking(d) {
  SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Bookings').appendRow([
    new Date().toISOString(), d.booking_type, d.class_iso, d.class_date, d.class_time, d.class_display,
    d.first_name, d.last_name, d.sei, d.mei, d.email, d.phone, d.dob, d.sex,
    d.country, d.address, d.postal_code, d.notes, d.payment_method, d.square_order_id, d.status,
  ]);
}

function _logForm(type, d) {
  var sheet = SpreadsheetApp.openById(CONFIG.SHEETS_ID).getSheetByName('CFR Forms');
  if (type === 'contact') {
    sheet.appendRow([new Date().toISOString(), 'contact', d.name, d.email, d.phone, d.inquiryType, d.message, '', '', '', '']);
  } else {
    sheet.appendRow([new Date().toISOString(), 'career',  d.name, d.email, d.phone, d.position, d.message, d.birthday || '', d.gender || '', d.fileName || '', d.driveUrl || '']);
  }
}

function _addReservationEvent(d) {
  var reservationCal = CalendarApp.getCalendarById(CONFIG.CALENDAR_RESERVATIONS);
  var scheduleCal    = CalendarApp.getCalendarById(CONFIG.CALENDAR_SCHEDULE);

  var tp        = d.class_time.split(':').map(Number);
  var dp        = d.class_iso.split('-').map(Number);
  var slotStart = new Date(dp[0], dp[1] - 1, dp[2], tp[0], tp[1], 0);
  var slotEnd   = new Date(slotStart.getTime() + 60 * 60 * 1000); // default 60 min

  // Use actual duration from Calendar 1 if available
  var searchEnd = new Date(slotStart.getTime() + 5 * 60 * 1000);
  var matches   = scheduleCal.getEvents(slotStart, searchEnd).filter(function(ev) {
    return Math.abs(ev.getStartTime().getTime() - slotStart.getTime()) < 60000;
  });
  if (matches.length > 0) slotEnd = matches[0].getEndTime();

  reservationCal.createEvent(
    '[' + d.booking_type.toUpperCase() + '] ' + d.buyerName,
    slotStart,
    slotEnd,
    { description: 'Email: ' + d.email + '\nPhone: ' + (d.phone || '\u2014') + '\nClass: ' + (d.class_display || d.class_time) }
  );
}

function _emailAdmin(subject, body) {
  try {
    GmailApp.sendEmail(
      CONFIG.STAFF_EMAILS,
      subject,
      body,
      { name: CONFIG.GYM_NAME + ' Website', replyTo: CONFIG.GYM_EMAIL }
    );
  } catch (ex) {
    console.error('Admin email failed', ex);
  }
}

function _emailCustomer(toEmail, subject, body) {
  try {
    GmailApp.sendEmail(
      toEmail,
      subject,
      body,
      { name: CONFIG.GYM_NAME, replyTo: CONFIG.GYM_EMAIL }
    );
  } catch (ex) {
    console.error('Customer email failed', ex);
  }
}

function _bookingAdminBody(d) {
  return 'New booking confirmed.\n\n' +
    'Class    : ' + d.classLabel      + '\n' +
    'Date     : ' + d.class_date      + '\n' +
    'Time     : ' + d.class_time      + '\n' +
    'Name     : ' + d.buyerName       + '\n' +
    'Sei / Mei: ' + d.sei + ' / ' + d.mei + '\n' +
    'Email    : ' + d.email           + '\n' +
    'Phone    : ' + (d.phone || '\u2014') + '\n' +
    'DOB      : ' + (d.dob   || '\u2014') + '\n' +
    'Sex      : ' + (d.sex   || '\u2014') + '\n' +
    'Country  : ' + (d.country      || '\u2014') + '\n' +
    'Address  : ' + (d.address      || '\u2014') + '\n' +
    'Postal   : ' + (d.postal_code  || '\u2014') + '\n' +
    'Notes    : ' + (d.notes        || '\u2014') + '\n' +
    'Payment  : ' + d.payment_method + '\n' +
    'Order ID : ' + (d.square_order_id || '\u2014');
}

function _bookingCustomerBody(d) {
  return '\u3054\u4e88\u7d04\u3042\u308a\u304c\u3068\u3046\u3054\u3056\u3044\u307e\u3059\u3002\n' +
    'Thank you for your booking, ' + d.buyerName + '.\n\n' +
    d.classLabel + '\n' +
    d.class_date + '  ' + d.class_time + '\n\n' +
    '\u30b8\u30e0\u306b\u3066\u304a\u5f85\u3061\u3057\u3066\u304a\u308a\u307e\u3059\u3002\n' +
    'We look forward to seeing you.\n\n' +
    '\u2015\n' + CONFIG.GYM_NAME + '\n' + CONFIG.GYM_EMAIL;
}

function _squareRequest(method, path, payload) {
  var options = {
    method: method,
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

// ===== ONE-TIME SETUP (run manually from Apps Script editor) =====
function setupSheetHeaders() {
  var ss = SpreadsheetApp.openById(CONFIG.SHEETS_ID);

  var b = ss.getSheetByName('CFR Bookings');
  if (b && b.getLastRow() === 0) {
    b.appendRow(['timestamp','booking_type','class_iso','class_date','class_time','class_display',
      'first_name','last_name','sei','mei','email','phone','dob','sex',
      'country','address','postal_code','notes','payment_method','square_order_id','status']);
  }

  var c = ss.getSheetByName('CFR Credits');
  if (c && c.getLastRow() === 0) {
    c.appendRow(['email','name','credits','last_updated']);
  }

  var f = ss.getSheetByName('CFR Forms');
  if (f && f.getLastRow() === 0) {
    f.appendRow(['timestamp','form_type','name','email','phone','detail_1','message','birthday','gender','file_name','file_url']);
  }

  Logger.log('Sheet headers ready.');
}
