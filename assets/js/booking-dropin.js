// CrossFit Roppongi — Drop-In / Open Gym Booking Page JS
import { getMonthAvailability, getSlots, searchCustomer, createBooking, initSquare, tokenize } from './booking-api.js';

// ── Constants ────────────────────────────────────────────────────────────────
const SINGLE_PRICE   = 4950;
const PACK_PRICE     = 11550;
const CATALOG_SINGLE = 'XTC3KQLY53HFTWI7NELLUOS4'; // Drop In (also used for Open Gym single)
const CATALOG_PACK   = 'IOAQWVXXEOBQIJJ77WMTSVQH'; // Drop In 3-Pack
const HOLD_SECONDS   = 15 * 60;

// ── State ────────────────────────────────────────────────────────────────────
let classType     = null;   // 'dropin' | 'opengym'
let packMode      = false;
let squareHandles = null;
let paymentMethod = 'card';
let holdInterval  = null;
let holdLeft      = HOLD_SECONDS;

// Per-session state (indices 0, 1, 2)
const sessions = [
  { calYear: null, calMonth: null, monthData: {}, selectedDate: null, selectedSlot: null },
  { calYear: null, calMonth: null, monthData: {}, selectedDate: null, selectedSlot: null },
  { calYear: null, calMonth: null, monthData: {}, selectedDate: null, selectedSlot: null },
];

// ── DOM helper ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Init ─────────────────────────────────────────────────────────────────────
function init() {
  const now = new Date();
  sessions.forEach(s => {
    s.calYear  = now.getFullYear();
    s.calMonth = now.getMonth() + 1;
  });
  populateDOBSelects();
  bindEvents();
  showStep(2);
  updateMonthLabel(0);
  loadMonth(0);
}

// ── Step navigation ───────────────────────────────────────────────────────────
// Steps: 2=calendar, 3=customer info, 4=payment, 5=confirmation
// Indicator nodes: 1=DATE&TIME, 2=YOUR INFO, 3=PAYMENT
function showStep(n) {
  for (let i = 1; i <= 5; i++) {
    const el = $(`step-${i}`);
    if (el) el.classList.toggle('active', i === n);
  }
  // Map page step → indicator node: 2→1, 3→2, 4→3, 5→3 (done)
  const ind = n === 2 ? 1 : n === 3 ? 2 : 3;
  const done = n === 5;
  document.querySelectorAll('.step-node').forEach(node => {
    const s = parseInt(node.dataset.step);
    node.classList.remove('active', 'done');
    if (done || s < ind) node.classList.add('done');
    else if (s === ind) node.classList.add('active');
  });
  for (let i = 1; i <= 2; i++) {
    $(`line-${i}-${i + 1}`)?.classList.toggle('done', done || i < ind);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Calendar helpers ──────────────────────────────────────────────────────────
const calId = (si, suffix) => `cal-${si + 1}-${suffix}`;

function updateMonthLabel(si) {
  const s = sessions[si];
  const d = new Date(s.calYear, s.calMonth - 1, 1);
  $(calId(si, 'month-label')).textContent =
    d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
  const now = new Date();
  $(calId(si, 'prev')).disabled =
    s.calYear < now.getFullYear() ||
    (s.calYear === now.getFullYear() && s.calMonth <= now.getMonth() + 1);
}

async function loadMonth(si) {
  $(calId(si, 'grid')).innerHTML =
    '<div class="loading-wrap" style="grid-column:span 7"><div class="loading-ring"></div></div>';
  clearError(`error-session-${si + 1}`);
  try {
    // Always fetch dropin and opengym separately — 3-pack allows mixing both types freely
    const [dropinData, opengymData] = await Promise.all([
      getMonthAvailability('dropin', sessions[si].calYear, sessions[si].calMonth),
      getMonthAvailability('opengym', sessions[si].calYear, sessions[si].calMonth),
    ]);
    const merged = { ...dropinData };
    for (const [date, info] of Object.entries(opengymData)) {
      if (!merged[date]) {
        merged[date] = info;
      } else {
        merged[date].has_availability = merged[date].has_availability || info.has_availability;
        merged[date].slots = (merged[date].slots || 0) + info.slots;
      }
    }
    sessions[si].monthData = merged;
  } catch (e) {
    showError(`error-session-${si + 1}`, 'カレンダーの読み込みに失敗しました。ページを再読み込みしてください。');
    sessions[si].monthData = {};
  }
  renderCalendar(si);
}

function getBlockedDates(si) {
  const blocked = new Set();
  sessions.forEach((s, i) => {
    if (i !== si && s.selectedDate) blocked.add(s.selectedDate);
  });
  return blocked;
}

function renderCalendar(si) {
  const s           = sessions[si];
  const grid        = $(calId(si, 'grid'));
  grid.innerHTML    = '';
  const firstDay    = new Date(s.calYear, s.calMonth - 1, 1).getDay();
  const daysInMonth = new Date(s.calYear, s.calMonth, 0).getDate();
  const todayStr    = toDateStr(new Date());
  const blocked     = getBlockedDates(si);

  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-cell empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr   = toDateStr(new Date(s.calYear, s.calMonth - 1, d));
    const isPast    = dateStr < todayStr;
    const isBlocked = blocked.has(dateStr);
    const data      = s.monthData[dateStr];
    const avail     = !isPast && !isBlocked && data && data.has_availability;
    const sel       = dateStr === s.selectedDate;
    const isToday   = dateStr === todayStr;

    const cell = document.createElement('div');
    cell.className =
      'cal-cell' +
      (avail     ? ' available'   : ' unavailable') +
      (sel       ? ' selected'    : '') +
      (isBlocked ? ' cal-blocked' : '') +
      (isToday && !sel ? ' today' : '');
    cell.textContent = d;
    if (isBlocked) cell.title = '他セッションで選択済 / Already selected';
    if (avail) {
      cell.addEventListener('click', () => onDateClick(si, dateStr));
    }
    grid.appendChild(cell);
  }
}

async function onDateClick(si, dateStr) {
  const s = sessions[si];
  s.selectedDate = dateStr;
  s.selectedSlot = null;
  renderCalendar(si);

  // Reset next buttons for this session
  if (si === 0) { $('btn-next-single').disabled = true; $('btn-add-pack').disabled = true; }
  if (si === 1) $('btn-session2-next').disabled = true;
  if (si === 2) $('btn-session3-next').disabled = true;

  $(calId(si, 'slots-placeholder')).style.display = 'none';
  $(calId(si, 'slots-list')).style.display        = 'none';
  $(calId(si, 'slots-loading')).style.display     = 'block';
  clearError(`error-session-${si + 1}`);

  try {
    // Always fetch dropin and opengym separately — 3-pack allows mixing both types freely
    const [dropinSlots, opengymSlots] = await Promise.all([
      getSlots('dropin', dateStr),
      getSlots('opengym', dateStr),
    ]);
    const slots = [...dropinSlots, ...opengymSlots]
      .sort((a, b) => (a.time_start || '').localeCompare(b.time_start || ''));
    renderSlots(si, slots);
  } catch (e) {
    showError(`error-session-${si + 1}`, 'タイムスロットの読み込みに失敗しました。もう一度お試しください。');
  }
  $(calId(si, 'slots-loading')).style.display = 'none';
  $(calId(si, 'slots-list')).style.display    = 'block';
}

function renderSlots(si, slots) {
  const list = $(calId(si, 'slots-list'));
  list.innerHTML = '';

  if (!slots || slots.length === 0) {
    list.innerHTML = `<p class="no-slots">この日は空きスロットがありません。<br>
      <span class="font_proxima" style="font-size:12px">No slots available on this date.</span></p>`;
    return;
  }

  slots.forEach(slot => {
    const left       = slot.slotsLeft ?? slot.available ?? 0;
    const isFull     = left === 0;
    const spotsClass = isFull ? 'full' : left <= 1 ? 'low' : '';
    const spotsText  = isFull
      ? '満席 / Full'
      : `残り${left}枠 / ${left} spot${left !== 1 ? 's' : ''}`;

    // Class type label
    const ct = slot.class_type || '';
    let ctLabelJP = '', ctLabelEN = '';
    if (ct === 'dropin') { ctLabelJP = 'ドロップイン'; ctLabelEN = 'Drop In (Coach-led class)'; }
    else if (ct === 'opengym') { ctLabelJP = 'オープンジム'; ctLabelEN = 'Open Gym (Self-directed session)'; }

    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'slot-btn' + (isFull ? ' full' : '');
    btn.disabled  = isFull;
    btn.innerHTML = `
      <div>
        <div class="slot-time font_proxima">${slot.timeStart ?? slot.time_start} – ${slot.timeEnd ?? slot.time_end}</div>
        ${ctLabelJP ? `<div style="font-size:12px; color:#555; margin-top:3px;">${ctLabelJP}<span class="font_proxima" style="margin-left:6px; color:#999;">${ctLabelEN}</span></div>` : ''}
      </div>
      <div class="slot-meta">
        ${slot.trainer && slot.trainer !== 'none' ? `<span class="slot-trainer">${slot.trainer}</span>` : ''}
        <span class="slot-spots ${spotsClass}">${spotsText}</span>
      </div>`;
    if (!isFull) btn.addEventListener('click', () => onSlotClick(si, slot, btn));
    list.appendChild(btn);
  });
}

function onSlotClick(si, slot, btn) {
  sessions[si].selectedSlot = slot;
  $(calId(si, 'slots-list')).querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  if (si === 0) {
    // Set classType from the selected slot (normalize underscores: drop_in → dropin)
    classType = (slot.class_type || '').replace(/_/g, '');
    $('btn-next-single').disabled = false;
    // Only allow 3-pack for dropin/opengym (both use same catalog)
    $('btn-add-pack').disabled    = false;
  } else if (si === 1) {
    $('btn-session2-next').disabled = false;
  } else if (si === 2) {
    $('btn-session3-next').disabled = false;
  }
}

// ── Month navigation ───────────────────────────────────────────────────────────
function prevMonth(si) {
  sessions[si].calMonth--;
  if (sessions[si].calMonth < 1) { sessions[si].calMonth = 12; sessions[si].calYear--; }
  resetSlots(si);
  updateMonthLabel(si);
  loadMonth(si);
}

function nextMonth(si) {
  sessions[si].calMonth++;
  if (sessions[si].calMonth > 12) { sessions[si].calMonth = 1; sessions[si].calYear++; }
  resetSlots(si);
  updateMonthLabel(si);
  loadMonth(si);
}

function resetSlots(si) {
  sessions[si].selectedDate = null;
  sessions[si].selectedSlot = null;
  $(calId(si, 'slots-placeholder')).style.display = 'block';
  $(calId(si, 'slots-list')).style.display        = 'none';
  $(calId(si, 'slots-loading')).style.display     = 'none';
}

// ── Single / Pack actions ─────────────────────────────────────────────────────
function goSingle() {
  if (!sessions[0].selectedSlot) return;
  packMode = false;
  startHoldTimer();
  showStep(3);
}

function goAddPack() {
  if (!sessions[0].selectedSlot) return;
  packMode = true;
  startHoldTimer();
  // Show session labels
  $('session-1-badge').style.display = 'block';
  // Reveal session 2
  $('session-2-section').style.display = 'block';
  $('session-3-section').style.display = 'none';
  sessions[1].selectedDate = null;
  sessions[1].selectedSlot = null;
  $('btn-session2-next').disabled = true;
  updateMonthLabel(1);
  loadMonth(1);
  setTimeout(() => $('session-2-section').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function goSession2Next() {
  if (!sessions[1].selectedSlot) return;
  // Reveal session 3
  $('session-3-section').style.display = 'block';
  sessions[2].selectedDate = null;
  sessions[2].selectedSlot = null;
  $('btn-session3-next').disabled = true;
  updateMonthLabel(2);
  loadMonth(2);
  setTimeout(() => $('session-3-section').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
}

function goSession3Next() {
  if (!sessions[2].selectedSlot) return;
  showStep(3);
}

// ── Hold timer ────────────────────────────────────────────────────────────────
function startHoldTimer() {
  holdLeft = HOLD_SECONDS;
  const timerEl = $('hold-timer');
  timerEl.classList.add('visible');
  timerEl.classList.remove('warning');
  clearInterval(holdInterval);
  holdInterval = setInterval(() => {
    holdLeft--;
    const fmt = `${String(Math.floor(holdLeft / 60)).padStart(2, '0')}:${String(holdLeft % 60).padStart(2, '0')}`;
    $('timer-val').textContent    = fmt;
    $('timer-val-en').textContent = fmt;
    if (holdLeft <= 300) timerEl.classList.add('warning');
    if (holdLeft <= 0) {
      clearInterval(holdInterval);
      timerEl.classList.remove('visible');
      sessions.forEach(s => { s.selectedDate = null; s.selectedSlot = null; });
      showError('error-session-1', 'セッションの予約時間が過ぎました。もう一度日時を選択してください。 / Your hold time has expired. Please reselect.');
      showStep(2);
    }
  }, 1000);
}

function stopHoldTimer() {
  clearInterval(holdInterval);
  $('hold-timer').classList.remove('visible');
}

// ── Email lookup ──────────────────────────────────────────────────────────────
async function lookupCustomer() {
  const email = $('input-email').value.trim();
  if (!email || !email.includes('@')) {
    showError('error-step3', '有効なメールアドレスを入力してください。 / Please enter a valid email address.');
    return;
  }
  clearError('error-step3');
  const btn = $('btn-lookup');
  btn.disabled    = true;
  btn.textContent = '検索中…';
  try {
    const result = await searchCustomer({ email });
    if (result.found && result.customer) {
      prefillForm(result.customer);
      $('found-banner').classList.add('visible');
    } else {
      $('found-banner').classList.remove('visible');
    }
  } catch (e) {
    $('found-banner').classList.remove('visible');
  }
  btn.disabled    = false;
  btn.textContent = '検索';
}

function prefillForm(c) {
  if (c.family_name)   $('input-last').value   = c.family_name;
  if (c.given_name)    $('input-first').value  = c.given_name;
  if (c.phone_number)  $('input-phone').value  = c.phone_number;
  if (c.email_address) $('input-email').value  = c.email_address;
  if (c.address) {
    const addr = c.address;
    const full = [addr.address_line_1, addr.locality].filter(Boolean).join(', ');
    if (full) $('input-address').value = full;
  }
  if (c.birthday) {
    const parts = c.birthday.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      if (y && y !== '0000') $('dob-year').value  = y;
      if (m)                 $('dob-month').value = m;
      if (d)                 $('dob-day').value   = d;
    }
  }
}

// ── Customer info → Payment ───────────────────────────────────────────────────
async function goToStep4() {
  clearError('error-step3');
  const email  = $('input-email').value.trim();
  const last   = $('input-last').value.trim();
  const first  = $('input-first').value.trim();
  const phone  = $('input-phone').value.trim();
  const dobY   = $('dob-year').value;
  const dobM   = $('dob-month').value;
  const dobD   = $('dob-day').value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value;
  const addr   = $('input-address').value.trim();

  if (!email || !email.includes('@')) return showError('error-step3', 'メールアドレスを入力してください。/ Please enter your email.');
  if (!last)                          return showError('error-step3', '姓を入力してください。/ Please enter your last name.');
  if (!first)                         return showError('error-step3', '名を入力してください。/ Please enter your first name.');
  if (!phone)                         return showError('error-step3', '電話番号を入力してください。/ Please enter your phone number.');
  if (!dobY || !dobM || !dobD)        return showError('error-step3', '生年月日を選択してください。/ Please select your date of birth.');
  if (!gender)                        return showError('error-step3', '性別を選択してください。/ Please select your gender.');
  if (!addr)                          return showError('error-step3', '住所を入力してください。/ Please enter your address.');

  updateOrderSummary(last, first);
  showStep(4);
  await initPayment();
}

function updateOrderSummary(last, first) {
  const ct = sessions[0]?.selectedSlot?.class_type || classType || '';
  const classNameJP = ct === 'opengym' ? 'オープンジム' : 'ドロップイン';
  const classNameEN = ct === 'opengym' ? 'Open Gym' : 'Drop In';
  // NOTE: sum-pack-label is a sibling span (not nested), so textContent is safe here
  $('sum-class').textContent = `${classNameJP} / ${classNameEN}`;

  if (packMode) {
    const s1 = sessions[0], s2 = sessions[1], s3 = sessions[2];
    const fmt = s => `${s.selectedDate} · ${s.selectedSlot.timeStart ?? s.selectedSlot.time_start}`;
    $('sum-sessions').innerHTML =
      `<div>① ${fmt(s1)}</div><div>② ${fmt(s2)}</div><div>③ ${fmt(s3)}</div>`;
    $('sum-pack-label').style.display    = 'inline';
    $('sum-total-price').textContent     = `¥${PACK_PRICE.toLocaleString()}`;
    $('btn-pay').innerHTML               =
      `¥${PACK_PRICE.toLocaleString()} を支払い予約する <span class="font_proxima">PAY &amp; BOOK</span>`;
  } else {
    const s1 = sessions[0];
    $('sum-sessions').textContent =
      `${s1.selectedDate} · ${s1.selectedSlot.timeStart ?? s1.selectedSlot.time_start}–${s1.selectedSlot.timeEnd ?? s1.selectedSlot.time_end}`;
    $('sum-pack-label').style.display    = 'none';
    $('sum-total-price').textContent     = `¥${SINGLE_PRICE.toLocaleString()}`;
    $('btn-pay').innerHTML               =
      `¥${SINGLE_PRICE.toLocaleString()} を支払い予約する <span class="font_proxima">PAY &amp; BOOK</span>`;
  }

  if (last || first) $('sum-name').textContent = `${last ?? ''} ${first ?? ''}`.trim();
}

// ── Square init ───────────────────────────────────────────────────────────────
async function initPayment() {
  if (squareHandles) return;
  const price = packMode ? PACK_PRICE : SINGLE_PRICE;

  $('square-loading').style.display = 'block';
  $('btn-pay').disabled = true;
  clearError('error-step4');

  try {
    squareHandles = await initSquare({ price });
    await squareHandles.card.attach('#card-container');
    if (squareHandles.googlePay) {
      await squareHandles.googlePay.attach('#gpay-container');
    } else {
      $('tab-gpay').style.display = 'none';
    }
    if (!squareHandles.applePay) {
      $('tab-apple').style.display = 'none';
    }
  } catch (e) {
    showError('error-step4', '決済システムの読み込みに失敗しました。ページを再読み込みください。 / Failed to load payment system. Please refresh.');
  }

  $('square-loading').style.display = 'none';
  $('privacy-check').addEventListener('change', () => {
    $('btn-pay').disabled = !$('privacy-check').checked;
  });
}

// ── Payment method tabs ───────────────────────────────────────────────────────
function selectPaymentMethod(method) {
  paymentMethod = method;
  document.querySelectorAll('.pm-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.method === method));
  document.querySelectorAll('.pm-panel').forEach(p => p.classList.remove('active'));
  $(`panel-${method}`).classList.add('active');
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handlePayment() {
  if (!$('privacy-check').checked) return;
  const price = packMode ? PACK_PRICE : SINGLE_PRICE;
  const btn = $('btn-pay');
  btn.disabled    = true;
  btn.textContent = '処理中… / Processing…';
  clearError('error-step4');

  try {
    const nonce  = await tokenize(paymentMethod, squareHandles);
    const last   = $('input-last').value.trim();
    const first  = $('input-first').value.trim();
    const dobY   = $('dob-year').value;
    const dobM   = $('dob-month').value;
    const dobD   = $('dob-day').value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;

    const customerFields = {
      customer_last:  last,
      customer_first: first,
      email:          $('input-email').value.trim(),
      phone:          $('input-phone').value.trim(),
      dob:            `${dobY}/${dobM}/${dobD}`,
      gender,
      address:        $('input-address').value.trim(),
      notes:          $('input-notes').value.trim(),
      sourceId:       nonce,
    };

    let result;

    if (packMode) {
      result = await createBooking({
        ...customerFields,
        class_type:        classType,
        pack:              'three_pack',
        catalog_object_id: CATALOG_PACK,
        sessions: sessions.map(s => ({
          event_id:         s.selectedSlot.eventId       ?? s.selectedSlot.event_id,
          class_date:       s.selectedDate,
          class_time_start: s.selectedSlot.timeStart     ?? s.selectedSlot.time_start,
          class_time_end:   s.selectedSlot.timeEnd       ?? s.selectedSlot.time_end,
        })),
      });
    } else {
      result = await createBooking({
        ...customerFields,
        class_type:        classType,
        pack:              'single',
        catalog_object_id: CATALOG_SINGLE,
        event_id:          sessions[0].selectedSlot.eventId   ?? sessions[0].selectedSlot.event_id,
        class_date:        sessions[0].selectedDate,
        class_time_start:  sessions[0].selectedSlot.timeStart ?? sessions[0].selectedSlot.time_start,
        class_time_end:    sessions[0].selectedSlot.timeEnd   ?? sessions[0].selectedSlot.time_end,
      });
    }

    stopHoldTimer();
    showConfirmation(result, last, first);
    showStep(5);

  } catch (e) {
    showError('error-step4', `予約に失敗しました: ${e.message} / Booking failed: ${e.message}`);
    btn.disabled    = false;
    updateOrderSummary();  // restore button text
  }
}

function showConfirmation(result, last, first) {
  const ct = sessions[0]?.selectedSlot?.class_type || classType || '';
  const classNameJP = ct === 'opengym' ? 'オープンジム' : 'ドロップイン';
  const classNameEN = ct === 'opengym' ? 'Open Gym' : 'Drop In';

  // Handle single or multi booking_id
  if (packMode && result.booking_ids) {
    $('confirm-booking-id').textContent = result.booking_ids.join(' · ');
  } else {
    $('confirm-booking-id').textContent = result.booking_id || '—';
  }

  $('confirm-class').textContent = `${classNameJP} / ${classNameEN}`;
  $('confirm-name').textContent  = `${last} ${first}`;
  $('confirm-price').textContent = packMode
    ? `¥${PACK_PRICE.toLocaleString()} (税込 / 3-pack)`
    : `¥${SINGLE_PRICE.toLocaleString()} (税込)`;

  if (packMode) {
    $('confirm-sessions-wrap').style.display = 'block';
    $('confirm-datetime-row').style.display  = 'none';
    const s1 = sessions[0], s2 = sessions[1], s3 = sessions[2];
    const fmt = s => `${s.selectedDate} · ${s.selectedSlot.timeStart ?? s.selectedSlot.time_start}`;
    $('confirm-sessions').innerHTML =
      `<div>① ${fmt(s1)}</div><div>② ${fmt(s2)}</div><div>③ ${fmt(s3)}</div>`;
  } else {
    $('confirm-sessions-wrap').style.display = 'none';
    $('confirm-datetime-row').style.display  = 'flex';
    $('confirm-datetime').textContent =
      `${sessions[0].selectedDate} · ${sessions[0].selectedSlot.timeStart ?? sessions[0].selectedSlot.time_start}–${sessions[0].selectedSlot.timeEnd ?? sessions[0].selectedSlot.time_end}`;
  }

  if (result.calendar_link) {
    $('confirm-cal-link').href = result.calendar_link;
  } else {
    $('confirm-cal-link').style.display = 'none';
  }
}

// ── DOB selects ───────────────────────────────────────────────────────────────
function populateDOBSelects() {
  const yearSel = $('dob-year');
  const daySel  = $('dob-day');
  const curYear = new Date().getFullYear();
  for (let y = curYear - 18; y >= 1940; y--) {
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = y;
    yearSel.appendChild(opt);
  }
  for (let d = 1; d <= 31; d++) {
    const opt = document.createElement('option');
    opt.value       = String(d).padStart(2, '0');
    opt.textContent = String(d).padStart(2, '0');
    daySel.appendChild(opt);
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function showError(id, msg) {
  const el = $(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearError(id) {
  const el = $(id);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible');
}

// ── Event bindings ────────────────────────────────────────────────────────────
function bindEvents() {
  // Step 2 — session 1 calendar
  $('cal-1-prev').addEventListener('click', () => prevMonth(0));
  $('cal-1-next').addEventListener('click', () => nextMonth(0));
  $('btn-next-single').addEventListener('click', goSingle);
  $('btn-add-pack').addEventListener('click', goAddPack);

  // Step 2 — session 2 calendar
  $('cal-2-prev').addEventListener('click', () => prevMonth(1));
  $('cal-2-next').addEventListener('click', () => nextMonth(1));
  $('btn-session2-next').addEventListener('click', goSession2Next);

  // Step 2 — session 3 calendar
  $('cal-3-prev').addEventListener('click', () => prevMonth(2));
  $('cal-3-next').addEventListener('click', () => nextMonth(2));
  $('btn-session3-next').addEventListener('click', goSession3Next);

  // Step 3 — customer info
  $('btn-lookup').addEventListener('click', lookupCustomer);
  $('input-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); lookupCustomer(); }
  });
  $('btn-to-step4').addEventListener('click', goToStep4);
  $('btn-back-to-step2').addEventListener('click', () => showStep(2));

  // Step 4 — payment
  $('btn-pay').addEventListener('click', handlePayment);
  $('btn-back-to-step3').addEventListener('click', () => showStep(3));
  document.querySelectorAll('.pm-tab').forEach(tab =>
    tab.addEventListener('click', () => selectPaymentMethod(tab.dataset.method)));
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
