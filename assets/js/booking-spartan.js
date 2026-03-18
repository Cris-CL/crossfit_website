// CrossFit Roppongi — Spartan Booking Page JS
import { getUpcomingClasses, searchCustomer, createBooking, validateCoupon, initSquare, tokenize } from './booking-api.js';

// ── Constants ────────────────────────────────────────────────────────────────
const CLASS_TYPE   = 'spartan';
const PRICE        = 4400;
const LOAD_SIZE    = 5;
const HOLD_SECONDS = 15 * 60;

// ── State ────────────────────────────────────────────────────────────────────
let selectedSlot   = null;
let squareHandles  = null;
let paymentMethod  = 'card';
let holdInterval   = null;
let holdLeft       = HOLD_SECONDS;
let currentOffset  = 0;
let hasMore        = false;
let couponCode     = '';
let couponDiscount = 0;
let effectivePrice = PRICE;

// ── DOM helper ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  populateDOBSelects();
  await loadClasses(0);
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

// ── Class list ────────────────────────────────────────────────────────────────
async function loadClasses(offset) {
  if (offset === 0) {
    $('list-loading').style.display = 'block';
    $('class-list').style.display   = 'none';
    clearError('error-step1');
  } else {
    $('btn-load-more').disabled    = true;
    $('btn-load-more').textContent = '読み込み中… / Loading…';
  }

  try {
    const result = await getUpcomingClasses(CLASS_TYPE, { limit: LOAD_SIZE, offset });
    hasMore       = result.hasMore;
    currentOffset = offset + result.slots.length;

    if (offset === 0) {
      $('class-list').innerHTML = '';
    }

    if (offset === 0 && result.slots.length === 0) {
      $('class-list').innerHTML = `
        <p style="text-align:center; color:#888; padding:32px; font-size:14px; line-height:1.9;">
          現在ご予約可能なクラスがありません。<br>
          <span class="font_proxima" style="font-size:12px">No classes available at this time. Please check back later.</span>
        </p>`;
    } else {
      result.slots.forEach(slot => appendClassCard(slot));
    }

    $('load-more-wrap').style.display = hasMore ? 'block' : 'none';

  } catch (e) {
    showError('error-step1', 'クラス情報の読み込みに失敗しました。ページを再読み込みしてください。 / Failed to load classes. Please refresh.');
  }

  $('list-loading').style.display = 'none';
  $('class-list').style.display   = 'flex';

  if (offset > 0) {
    $('btn-load-more').disabled    = false;
    $('btn-load-more').textContent = 'もっと見る / SHOW MORE';
  }
}

function appendClassCard(slot) {
  const list       = $('class-list');
  const left       = slot.available ?? 0;
  const isFull     = left === 0;
  const spotsClass = isFull ? 'full' : left <= 2 ? 'low' : 'ok';
  const spotsText  = isFull
    ? '満席 / Full'
    : left <= 2
      ? `残り${left}枠 / ${left} spot${left !== 1 ? 's' : ''} left`
      : `残り${left}枠 / ${left} spots`;

  const dateObj   = new Date(slot.date + 'T00:00:00+09:00');
  const dateLabel = dateObj.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  const card = document.createElement('div');
  card.className = 'class-card' + (isFull ? ' full' : '');
  card.innerHTML = `
    <div class="class-card-info">
      <div class="class-card-date">
        <span class="dow">${slot.day_of_week}</span>${dateLabel}
      </div>
      <div class="class-card-meta">
        <span class="font_proxima">${slot.time_start} – ${slot.time_end}</span>
        ${slot.trainer ? `<span>· ${slot.trainer}</span>` : ''}
        <span>· ${slot.duration}分</span>
      </div>
      <div style="margin-top:6px;">
        <span class="class-card-spots ${spotsClass}">${spotsText}</span>
      </div>
    </div>
    <button type="button" class="btn-select-class" ${isFull ? 'disabled' : ''}>
      ${isFull ? '満席' : '選択 / Select'}
    </button>`;

  if (!isFull) {
    card.querySelector('.btn-select-class').addEventListener('click', () => onSelectClass(slot, card));
  }
  list.appendChild(card);
}

function onSelectClass(slot, card) {
  selectedSlot = slot;
  document.querySelectorAll('.class-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.btn-select-class').forEach(b => {
    b.classList.remove('selected');
    if (!b.disabled) b.textContent = '選択 / Select';
  });
  card.classList.add('selected');
  card.querySelector('.btn-select-class').classList.add('selected');
  card.querySelector('.btn-select-class').textContent = '✓ 選択済み / Selected';
  $('btn-to-step2').disabled = false;
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
      showError('error-step1', 'セッションの予約時間が過ぎました。もう一度クラスを選択してください。 / Your hold time has expired. Please select a class again.');
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
    showError('error-step2', `顧客検索に失敗しました: ${e.message} / Customer lookup failed.`);
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
  if (c.birthday) {
    const parts = c.birthday.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
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

  const classNameJP = selectedSlot.class_name_jp || 'スパルタントレーニング';
  const classNameEN = selectedSlot.class_name_en || 'Spartan';

  $('sum-class').textContent    = `${classNameJP} / ${classNameEN}`;
  $('sum-datetime').textContent = `${selectedSlot.date} · ${selectedSlot.time_start}–${selectedSlot.time_end}`;
  $('sum-trainer').textContent  = selectedSlot.trainer || 'Marc Keen';
  $('sum-name').textContent     = `${last} ${first}`;

  // Reset coupon state when re-entering payment step
  couponCode     = '';
  couponDiscount = 0;
  effectivePrice = PRICE;
  updatePriceDisplay();
  $('coupon-input').value        = '';
  $('coupon-result').style.display = 'none';
  $('sum-discount-row').style.display = 'none';

  showStep(3);
  await initPayment();
}

// ── Coupon ────────────────────────────────────────────────────────────────────
async function applyCoupon() {
  const code = $('coupon-input').value.trim().toUpperCase();
  if (!code) return;

  const resultEl = $('coupon-result');
  resultEl.style.display    = 'block';
  resultEl.style.background = '#f9f9f9';
  resultEl.style.color      = '#666';
  resultEl.textContent      = '確認中… / Validating…';
  $('btn-apply-coupon').disabled = true;

  try {
    const data = await validateCoupon(code, CLASS_TYPE);

    if (data.valid) {
      couponCode     = code;
      couponDiscount = data.discount_amount;
      effectivePrice = Math.max(0, PRICE - couponDiscount);

      resultEl.style.background = '#f0fdf4';
      resultEl.style.color      = '#16a34a';
      resultEl.textContent      = `✓ 「${data.label}」が適用されました / "${data.label}" applied`;

      updatePriceDisplay();

      // Hide digital wallet tabs — price must match SDK init; credit card charges Order total_money
      $('tab-gpay').style.display   = 'none';
      $('tab-apple').style.display  = 'none';
      selectPaymentMethod('card');

    } else {
      couponCode     = '';
      couponDiscount = 0;
      effectivePrice = PRICE;
      resultEl.style.background = '#fef2f2';
      resultEl.style.color      = '#b91c1c';
      resultEl.textContent      = '✗ 無効なクーポンコードです / Invalid coupon code';
      updatePriceDisplay();
    }
  } catch (e) {
    resultEl.style.background = '#fef2f2';
    resultEl.style.color      = '#b91c1c';
    resultEl.textContent      = 'クーポンの確認に失敗しました / Coupon validation failed';
  }

  $('btn-apply-coupon').disabled = false;
}

function updatePriceDisplay() {
  const discountRow = $('sum-discount-row');
  if (couponDiscount > 0) {
    discountRow.style.display = 'flex';
    $('sum-discount').textContent = `-¥${couponDiscount.toLocaleString()}`;
  } else {
    discountRow.style.display = 'none';
  }
  $('sum-total-price').textContent = `¥${effectivePrice.toLocaleString()}`;
  $('btn-pay').textContent = `¥${effectivePrice.toLocaleString()} を支払い予約する`;
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

  const privacyEl = $('privacy-check');
  privacyEl.addEventListener('change', () => {
    $('btn-pay').disabled = !privacyEl.checked;
  });

  // Restore pay button text (may have been set by coupon)
  updatePriceDisplay();
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
      event_id:          selectedSlot.event_id,
      class_date:        selectedSlot.date,
      class_time_start:  selectedSlot.time_start,
      class_time_end:    selectedSlot.time_end,
      class_name_en:     selectedSlot.class_name_en || 'Spartan',
      class_name_jp:     selectedSlot.class_name_jp || 'スパルタントレーニング',
      trainer:           selectedSlot.trainer || '',
      catalog_object_id: selectedSlot.catalog_object_id || '',
      price:             selectedSlot.price || PRICE,
      duration:          selectedSlot.duration || 60,
      customer_last:     last,
      customer_first:    first,
      email:             $('input-email').value.trim(),
      phone:             $('input-phone').value.trim(),
      dob:               `${dobY}/${dobM}/${dobD}`,
      gender,
      address:           $('input-address').value.trim(),
      notes:             $('input-notes').value.trim(),
      pack:              'single',
      use_credit:        false,
      coupon_code:       couponCode,
      sourceId:          nonce,
    });

    stopHoldTimer();
    showConfirmation(result, last, first);
    showStep(4);

  } catch (e) {
    showError('error-step3', `予約に失敗しました: ${e.message} / Booking failed: ${e.message}`);
    btn.disabled    = false;
    updatePriceDisplay();
  }
}

function showConfirmation(result, last, first) {
  $('confirm-booking-id').textContent = result.booking_id || '—';
  $('confirm-class').textContent      = 'スパルタントレーニング / Spartan';
  $('confirm-datetime').textContent   = `${selectedSlot.date} · ${selectedSlot.time_start}–${selectedSlot.time_end}`;
  $('confirm-name').textContent       = `${last} ${first}`;
  $('confirm-price').textContent      = `¥${effectivePrice.toLocaleString()} (税込)`;
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
  $('btn-to-step2').addEventListener('click', goToStep2);
  $('btn-back-1').addEventListener('click', () => { stopHoldTimer(); showStep(1); });
  $('btn-lookup').addEventListener('click', lookupCustomer);
  $('btn-to-step3').addEventListener('click', goToStep3);
  $('btn-back-2').addEventListener('click', () => showStep(2));
  $('btn-pay').addEventListener('click', handlePayment);
  $('btn-load-more').addEventListener('click', () => loadClasses(currentOffset));
  $('btn-apply-coupon').addEventListener('click', applyCoupon);
  $('coupon-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
  });
  document.querySelectorAll('.pm-tab').forEach(tab =>
    tab.addEventListener('click', () => selectPaymentMethod(tab.dataset.method)));
  $('input-email').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); lookupCustomer(); }
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
