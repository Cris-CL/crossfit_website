// CrossFit Roppongi — Trial Booking Page JS
import { getMonthAvailability, getSlots, searchCustomer, createBooking, initSquare, tokenize } from './booking-api.js';

// ── Constants ────────────────────────────────────────────────────────────────
const CLASS_TYPE   = 'trial';
const PRICE        = 3300;
const CATALOG_ID   = '4PRHSDJ6BC5TKW3NC5XH5AEG';
const HOLD_SECONDS = 15 * 60;

// ── State ────────────────────────────────────────────────────────────────────
let calYear, calMonth;
let monthData     = {};
let selectedDate  = null;
let selectedSlot  = null;
let squareHandles = null;
let paymentMethod = 'card';
let holdInterval  = null;
let holdLeft      = HOLD_SECONDS;

// ── DOM helper ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const now = new Date();
  calYear   = now.getFullYear();
  calMonth  = now.getMonth() + 1;

  populateDOBSelects();
  updateMonthLabel();
  await loadMonth();
  bindEvents();
}

// ── Step navigation ───────────────────────────────────────────────────────────
function showStep(n) {
  for (let i = 1; i <= 4; i++) {
    $(`step-${i}`).classList.toggle('active', i === n);
  }
  document.querySelectorAll('.step-node').forEach(node => {
    const s = parseInt(node.dataset.step);
    node.classList.remove('active', 'done');
    if (s === n) node.classList.add('active');
    else if (s < n) node.classList.add('done');
  });
  for (let i = 1; i <= 3; i++) {
    $(`line-${i}-${i + 1}`)?.classList.toggle('done', i < n);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function updateMonthLabel() {
  const d = new Date(calYear, calMonth - 1, 1);
  $('cal-month-label').textContent = d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });

  const now = new Date();
  $('cal-prev').disabled =
    calYear < now.getFullYear() ||
    (calYear === now.getFullYear() && calMonth <= now.getMonth() + 1);
}

async function loadMonth() {
  $('calendar-grid').innerHTML =
    '<div class="loading-wrap" style="grid-column:span 7"><div class="loading-ring"></div></div>';
  clearError('error-step1');
  try {
    monthData = await getMonthAvailability(CLASS_TYPE, calYear, calMonth);
  } catch (e) {
    showError('error-step1', 'カレンダーの読み込みに失敗しました。ページを再読み込みしてください。');
    monthData = {};
  }
  renderCalendar();
}

function renderCalendar() {
  const grid        = $('calendar-grid');
  grid.innerHTML    = '';
  const firstDay    = new Date(calYear, calMonth - 1, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const todayStr    = toDateStr(new Date());

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(new Date(calYear, calMonth - 1, d));
    const isPast  = dateStr < todayStr;
    const data    = monthData[dateStr];
    const avail   = !isPast && data && data.has_availability;
    const sel     = dateStr === selectedDate;
    const isToday = dateStr === todayStr;

    const cell = document.createElement('div');
    cell.className =
      'cal-cell' +
      (avail   ? ' available'  : ' unavailable') +
      (sel     ? ' selected'   : '') +
      (isToday && !sel ? ' today' : '');
    cell.textContent = d;

    if (avail) {
      cell.addEventListener('click', () => onDateClick(dateStr));
      cell.title = `${data.slots || 0} spots available`;
    }
    grid.appendChild(cell);
  }
}

async function onDateClick(dateStr) {
  selectedDate = dateStr;
  selectedSlot = null;
  $('btn-to-step2').disabled = true;
  renderCalendar();

  $('slots-placeholder').style.display = 'none';
  $('slots-list').style.display        = 'none';
  $('slots-loading').style.display     = 'block';
  clearError('error-step1');

  try {
    const slots = await getSlots(CLASS_TYPE, dateStr);
    renderSlots(slots);
  } catch (e) {
    showError('error-step1', 'タイムスロットの読み込みに失敗しました。もう一度お試しください。');
  }

  $('slots-loading').style.display = 'none';
  $('slots-list').style.display    = 'block';
}

function renderSlots(slots) {
  const list = $('slots-list');
  list.innerHTML = '';

  if (!slots || slots.length === 0) {
    list.innerHTML = `
      <p class="no-slots">
        この日は空きスロットがありません。<br>
        <span class="font_proxima" style="font-size:12px">No slots available on this date.</span>
      </p>`;
    return;
  }

  slots.forEach(slot => {
    const left       = slot.slotsLeft ?? slot.available ?? 0;
    const isFull     = left === 0;
    const spotsClass = isFull ? 'full' : left <= 1 ? 'low' : '';
    const spotsText  = isFull
      ? '満席 / Full'
      : `残り${left}枠 / ${left} spot${left !== 1 ? 's' : ''}`;

    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'slot-btn' + (isFull ? ' full' : '');
    btn.disabled  = isFull;
    btn.innerHTML = `
      <div class="slot-time font_proxima">${slot.timeStart ?? slot.time_start} – ${slot.timeEnd ?? slot.time_end}</div>
      <div class="slot-meta">
        ${slot.coach ? `<span class="slot-trainer">${slot.coach}</span>` : ''}
        <span class="slot-spots ${spotsClass}">${spotsText}</span>
      </div>`;

    if (!isFull) btn.addEventListener('click', () => onSlotClick(slot, btn));
    list.appendChild(btn);
  });
}

function onSlotClick(slot, btn) {
  selectedSlot = slot;
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  $('btn-to-step2').disabled = false;
}

// ── Month navigation ──────────────────────────────────────────────────────────
function prevMonth() {
  calMonth--;
  if (calMonth < 1) { calMonth = 12; calYear--; }
  resetSlots();
  updateMonthLabel();
  loadMonth();
}

function nextMonth() {
  calMonth++;
  if (calMonth > 12) { calMonth = 1; calYear++; }
  resetSlots();
  updateMonthLabel();
  loadMonth();
}

function resetSlots() {
  selectedDate = null;
  selectedSlot = null;
  $('btn-to-step2').disabled       = true;
  $('slots-placeholder').style.display = 'block';
  $('slots-list').style.display        = 'none';
  $('slots-loading').style.display     = 'none';
}

// ── Step 1 → 2 ────────────────────────────────────────────────────────────────
function goToStep2() {
  if (!selectedSlot) return;
  startHoldTimer();
  showStep(2);
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
      selectedSlot = null;
      $('btn-to-step2').disabled = true;
      showError('error-step1', 'セッションの予約時間が過ぎました。もう一度日時を選択してください。 / Your hold time has expired. Please select a date again.');
      showStep(1);
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
    showError('error-step2', '有効なメールアドレスを入力してください。 / Please enter a valid email address.');
    return;
  }
  clearError('error-step2');
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
    showError('error-step2', `顧客検索に失敗しました: ${e.message} / Customer lookup failed: ${e.message}`);
  }

  btn.disabled    = false;
  btn.textContent = '検索';
}

function prefillForm(c) {
  if (c.family_name)   $('input-last').value    = c.family_name;
  if (c.given_name)    $('input-first').value   = c.given_name;
  if (c.phone_number)  $('input-phone').value   = c.phone_number;
  if (c.email_address) $('input-email').value   = c.email_address;
  if (c.address) {
    const addr = c.address;
    const full = [addr.address_line_1, addr.locality].filter(Boolean).join(', ');
    if (full) $('input-address').value = full;
  }
  // Square stores birthday as YYYY-MM-DD (year may be 0000 if not provided)
  if (c.birthday) {
    const parts = c.birthday.split('-');
    if (parts.length === 3) {
      const y = parts[0], m = parts[1], d = parts[2];
      if (y && y !== '0000') $('dob-year').value  = y;
      if (m) $('dob-month').value = m;
      if (d) $('dob-day').value   = d;
    }
  }
}

// ── Step 2 → 3 ────────────────────────────────────────────────────────────────
async function goToStep3() {
  clearError('error-step2');

  const email  = $('input-email').value.trim();
  const last   = $('input-last').value.trim();
  const first  = $('input-first').value.trim();
  const phone  = $('input-phone').value.trim();
  const dobY   = $('dob-year').value;
  const dobM   = $('dob-month').value;
  const dobD   = $('dob-day').value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value;
  const addr   = $('input-address').value.trim();

  if (!email || !email.includes('@')) return showError('error-step2', 'メールアドレスを入力してください。/ Please enter your email.');
  if (!last)                          return showError('error-step2', '姓を入力してください。/ Please enter your last name.');
  if (!first)                         return showError('error-step2', '名を入力してください。/ Please enter your first name.');
  if (!phone)                         return showError('error-step2', '電話番号を入力してください。/ Please enter your phone number.');
  if (!dobY || !dobM || !dobD)        return showError('error-step2', '生年月日を選択してください。/ Please select your date of birth.');
  if (!gender)                        return showError('error-step2', '性別を選択してください。/ Please select your gender.');
  if (!addr)                          return showError('error-step2', '住所を入力してください。/ Please enter your address.');
  if (!$('input-lead-source').value)  return showError('error-step2', 'どこで知りましたか？をご選択ください。/ Please select how you heard about us.');

  $('sum-class').textContent    = `${selectedSlot.langJP || selectedSlot.class_name_jp || '体験レッスン'} / Trial Class`;
  $('sum-datetime').textContent = `${selectedDate} · ${selectedSlot.timeStart ?? selectedSlot.time_start}–${selectedSlot.timeEnd ?? selectedSlot.time_end}`;
  $('sum-trainer').textContent  = selectedSlot.coach || 'Roppongi Staff';
  $('sum-name').textContent     = `${last} ${first}`;

  showStep(3);
  await initPayment();
}

// ── Square init ───────────────────────────────────────────────────────────────
async function initPayment() {
  if (squareHandles) return;

  $('square-loading').style.display = 'block';
  $('btn-pay').disabled = true;
  clearError('error-step3');

  try {
    squareHandles = await initSquare({ price: PRICE });
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
    showError('error-step3', '決済システムの読み込みに失敗しました。ページを再読み込みください。 / Failed to load payment system. Please refresh.');
  }

  $('square-loading').style.display = 'none';

  // Privacy checkbox controls pay button
  const privacyEl = $('privacy-check');
  privacyEl.addEventListener('change', () => {
    $('btn-pay').disabled = !privacyEl.checked;
  });
}

// ── Payment method tabs ───────────────────────────────────────────────────────
function selectPaymentMethod(method) {
  paymentMethod = method;
  document.querySelectorAll('.pm-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.method === method));
  document.querySelectorAll('.pm-panel').forEach(p =>
    p.classList.remove('active'));
  $(`panel-${method}`).classList.add('active');
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function handlePayment() {
  if (!$('privacy-check').checked) return;

  const btn = $('btn-pay');
  btn.disabled    = true;
  btn.textContent = '処理中… / Processing…';
  clearError('error-step3');

  try {
    const nonce = await tokenize(paymentMethod, squareHandles);

    const last   = $('input-last').value.trim();
    const first  = $('input-first').value.trim();
    const dobY   = $('dob-year').value;
    const dobM   = $('dob-month').value;
    const dobD   = $('dob-day').value;
    const gender = document.querySelector('input[name="gender"]:checked')?.value;

    const result = await createBooking({
      class_type:        CLASS_TYPE,
      event_id:          selectedSlot.eventId        ?? selectedSlot.event_id,
      class_date:        selectedDate,
      class_time_start:  selectedSlot.timeStart      ?? selectedSlot.time_start,
      class_time_end:    selectedSlot.timeEnd         ?? selectedSlot.time_end,
      customer_last:     last,
      customer_first:    first,
      email:             $('input-email').value.trim(),
      phone:             $('input-phone').value.trim(),
      dob:               `${dobY}/${dobM}/${dobD}`,
      gender,
      address:           $('input-address').value.trim(),
      notes:             $('input-notes').value.trim(),
      lead_source:       $('input-lead-source').value || '',
      pack:              'single',
      use_credit:        false,
      sourceId:          nonce,
    });

    stopHoldTimer();
    showConfirmation(result, last, first);
    showStep(4);

  } catch (e) {
    showError('error-step3', `予約に失敗しました: ${e.message} / Booking failed: ${e.message}`);
    btn.disabled    = false;
    btn.textContent = `¥${PRICE.toLocaleString()} を支払い予約する`;
  }
}

function showConfirmation(result, last, first) {
  $('confirm-booking-id').textContent = result.booking_id || '—';
  $('confirm-class').textContent      = '体験レッスン / Trial Class';
  $('confirm-datetime').textContent   = `${selectedDate} · ${selectedSlot.timeStart ?? selectedSlot.time_start}–${selectedSlot.timeEnd ?? selectedSlot.time_end}`;
  $('confirm-name').textContent       = `${last} ${first}`;
  $('confirm-price').textContent      = `¥${PRICE.toLocaleString()} (税込)`;
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
    opt.value = String(d).padStart(2, '0');
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
  el.textContent = msg;
  el.classList.add('visible');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearError(id) {
  const el = $(id);
  el.textContent = '';
  el.classList.remove('visible');
}

// ── Event bindings ────────────────────────────────────────────────────────────
function bindEvents() {
  $('cal-prev').addEventListener('click', prevMonth);
  $('cal-next').addEventListener('click', nextMonth);
  $('btn-to-step2').addEventListener('click', goToStep2);
  $('btn-back-1').addEventListener('click', () => { stopHoldTimer(); showStep(1); });
  $('btn-lookup').addEventListener('click', lookupCustomer);
  $('btn-to-step3').addEventListener('click', goToStep3);
  $('btn-back-2').addEventListener('click', () => showStep(2));
  $('btn-pay').addEventListener('click', handlePayment);
  document.querySelectorAll('.pm-tab').forEach(tab =>
    tab.addEventListener('click', () => selectPaymentMethod(tab.dataset.method)));
  $('input-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); lookupCustomer(); }
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
