'use strict';

/* ================= Veri ================= */

const KEY = 'akis.v1';
const blank = () => ({ profile: { name: '', theme: 'system' }, accounts: [], items: [] });

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const d = JSON.parse(raw);
    return Object.assign(blank(), d, { profile: Object.assign(blank().profile, d.profile || {}) });
  } catch (e) {
    return blank();
  }
}

let db = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    toast('Kaydedilemedi: tarayıcı depolaması kapalı olabilir');
  }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ================= Yardımcılar ================= */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_S = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAYS_S = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const todayStr = () => ymd(new Date());
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const lastDay = (y, m) => new Date(y, m + 1, 0).getDate();
function addMonths(s, n) {
  const d = parse(s);
  const day = d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
  t.setDate(Math.min(day, lastDay(t.getFullYear(), t.getMonth())));
  return ymd(t);
}
const fmtDate = (s) => { const d = parse(s); return `${d.getDate()} ${MONTHS_S[d.getMonth()]} ${d.getFullYear()}`; };
const fmtDateShort = (s) => { const d = parse(s); return `${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };

const nf = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const money = (v) => `${nf.format(v).replace(/,00$/, '')} ₺`;
const money0 = (v) => `${nf0.format(Math.round(v))} ₺`;
function bigMoney(v) {
  const [i, f] = nf.format(Math.abs(v)).split(',');
  return `<span class="big-int">${v < 0 ? '−' : ''}${i}</span><span class="big-dec">,${f}</span><span class="big-cur">₺</span>`;
}
function parseAmount(s) {
  s = String(s || '').replace(/[\s₺]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const v = parseFloat(s);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN;
}

// Tutar kutusu yazılan rakam kadar genişlesin, ₺ işareti rakamın yanında dursun
document.addEventListener('input', (e) => { if (e.target.matches('.amount-in input')) fitAmount(e.target); });
function fitAmount(el) {
  const v = el.value || el.placeholder;
  const narrow = (v.match(/[.,\-−]/g) || []).length;
  el.style.width = `${Math.max(1, v.length - narrow * 0.6) + 0.2}ch`;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2400);
}

const svg = (g, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[g] || GLYPHS.dots}</svg>`;

/* ================= Katalog ================= */

const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const bankById = Object.fromEntries(BANKS.map((b) => [b.id, b]));

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

// Bir kalemin ikonu: marka logosu, çizgi ikon ya da baş harfler
function iconHTML(o, size = '') {
  const color = o.color || '#64748B';
  if (o.logo && LOGOS[o.logo]) {
    const bg = o.bg || color;
    const fg = o.bg ? color : (o.dark || lum(bg) > 0.72 ? '#111' : '#fff');
    return `<span class="ico ${size}" style="background:${bg}"><svg viewBox="0 0 24 24" style="fill:${fg}" aria-hidden="true"><path d="${LOGOS[o.logo]}"/></svg></span>`;
  }
  if (o.glyph) {
    return `<span class="ico soft ${size}" style="--c:${color}">${svg(o.glyph)}</span>`;
  }
  const txt = o.abbr || (o.name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const fg = o.dark || lum(color) > 0.72 ? '#111' : '#fff';
  return `<span class="ico ${size}" style="background:${color};color:${fg}"><b class="${txt.length > 2 ? 'sm' : ''}">${esc(txt)}</b></span>`;
}

/* ================= Tekrarlar ================= */

const REPEATS = [
  { id: 'once', label: 'Tek sefer', unit: 'once', n: 1 },
  { id: 'w1', label: 'Her hafta', unit: 'week', n: 1 },
  { id: 'w2', label: '2 haftada bir', unit: 'week', n: 2 },
  { id: 'm1', label: 'Her ay', unit: 'month', n: 1 },
  { id: 'm2', label: '2 ayda bir', unit: 'month', n: 2 },
  { id: 'm3', label: '3 ayda bir', unit: 'month', n: 3 },
  { id: 'm6', label: '6 ayda bir', unit: 'month', n: 6 },
  { id: 'y1', label: 'Her yıl', unit: 'year', n: 1 },
];
const repeatOf = (it) => REPEATS.find((r) => r.unit === it.unit && r.n === it.n) || REPEATS[0];
const repeatLabel = (it) => {
  const r = repeatOf(it).label;
  return it.count && it.unit !== 'once' ? `${r} · ${it.count} kez` : r;
};

// Bir kalemin [from, to] arasındaki tarihleri
function occurrences(it, from, to) {
  const out = [];
  const end = it.until && it.until < to ? it.until : to;
  if (it.start > end) return out;
  const max = it.count || Infinity;
  if (it.unit === 'once') {
    if (it.start >= from && it.start <= end) out.push(it.start);
    return out;
  }
  if (it.unit === 'week') {
    const step = 7 * it.n;
    let k = Math.max(0, Math.ceil(daysBetween(it.start, from) / step));
    for (; k < max; k++) {
      const d = addDays(it.start, k * step);
      if (d > end) break;
      if (d >= from) out.push(d);
    }
    return out;
  }
  const months = it.unit === 'year' ? 12 * it.n : it.n;
  const s = parse(it.start), f = parse(from);
  const diff = (f.getFullYear() - s.getFullYear()) * 12 + f.getMonth() - s.getMonth();
  let k = Math.max(0, Math.floor(diff / months) - 1);
  for (; k < max; k++) {
    const d = addMonths(it.start, k * months);
    if (d > end) break;
    if (d >= from) out.push(d);
  }
  return out;
}

function events(from, to) {
  const list = [];
  for (const it of db.items) {
    for (const date of occurrences(it, from, to)) {
      list.push({ it, date, amount: amountOn(it, date), done: !!(it.done && it.done[date]) });
    }
  }
  return list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.amount - a.amount));
}

const amountOn = (it, date) => (it.overrides && it.overrides[date] != null ? it.overrides[date] : it.amount);
const signed = (e) => (e.it.kind === 'income' ? e.amount : -e.amount);
const monthRange = (y, m) => [ymd(new Date(y, m, 1, 12)), ymd(new Date(y, m, lastDay(y, m), 12))];

function nextDate(it) {
  const t = todayStr();
  const [d] = occurrences(it, t, addDays(t, 800));
  return d || null;
}

const isActive = (it) => it.unit !== 'once' && !!nextDate(it);

/* ================= Durum ve gezinme ================= */

const ui = {
  tab: 'home',
  calY: new Date().getFullYear(),
  calM: new Date().getMonth(),
  calSel: todayStr(),
  statY: new Date().getFullYear(),
  statM: new Date().getMonth(),
};

function applyTheme() {
  const t = db.profile.theme;
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name=theme-color]').setAttribute('content', dark ? '#0d0e16' : '#eef0f8');
}

function go(tab) {
  ui.tab = tab;
  $$('.tabbar [data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  render();
  window.scrollTo(0, 0);
}

function render() {
  const v = $('#view');
  v.innerHTML = { home: homeView, calendar: calendarView, accounts: accountsView, stats: statsView }[ui.tab]();
  v.classList.remove('enter');
  void v.offsetWidth;
  v.classList.add('enter');
}

/* ================= Ortak parçalar ================= */

function badgeFor(e) {
  const t = todayStr();
  if (e.done) return `<span class="badge ok">${e.it.kind === 'income' ? 'GELDİ' : 'ÖDENDİ'}</span>`;
  const d = daysBetween(t, e.date);
  if (d < 0) return `<span class="badge late">${e.it.kind === 'income' ? 'GELMEDİ' : 'GECİKTİ'}</span>`;
  if (d === 0) return '<span class="badge today">BUGÜN</span>';
  if (d === 1) return '<span class="badge soon">YARIN</span>';
  if (d <= 7) return `<span class="badge soon">${d} GÜN</span>`;
  return '';
}

function eventRow(e, opts = {}) {
  const inc = e.it.kind === 'income';
  const sub = opts.time ? repeatLabel(e.it) : `${repeatLabel(e.it)} · ${fmtDate(e.date)}`;
  return `<button class="row ${e.done ? 'is-done' : ''}" data-occ="${e.it.id}|${e.date}">
    ${iconHTML(e.it)}
    <span class="row-main">
      <span class="row-title"><span class="ellipsis">${esc(e.it.name)}</span>${badgeFor(e)}</span>
      <span class="row-sub">${esc(sub)}</span>
    </span>
    <span class="row-amt ${inc ? 'inc' : ''}">
      <b>${inc ? '+' : ''}${money(e.amount)}</b>
      <small>${e.it.unit === 'once' ? 'tek sefer' : repeatOf(e.it).label.toLowerCase()}</small>
    </span>
  </button>`;
}

function emptyState(text, cta = true) {
  return `<div class="empty card">
    <div class="empty-ico">${svg('receipt')}</div>
    <p>${text}</p>
    ${cta ? '<button class="btn primary" data-act="add">+ İlk kaydını ekle</button>' : ''}
  </div>`;
}

const accountsTotal = () => db.accounts.reduce((s, a) => s + (a.balance || 0), 0);

/* ================= Ana sayfa ================= */

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  if (h < 22) return 'İyi akşamlar';
  return 'İyi geceler';
}

function homeView() {
  const t = todayStr();
  const now = new Date();
  const [ms, me] = monthRange(now.getFullYear(), now.getMonth());
  const month = events(ms, me);
  const inc = month.filter((e) => e.it.kind === 'income').reduce((s, e) => s + e.amount, 0);
  const exp = month.filter((e) => e.it.kind === 'expense').reduce((s, e) => s + e.amount, 0);
  const pendingNet = month.filter((e) => !e.done && e.date >= t).reduce((s, e) => s + signed(e), 0);
  const total = accountsTotal();
  const projected = total + pendingNet;

  const upcoming = events(addDays(t, -30), addDays(t, 45)).filter((e) => !e.done);
  const overdue = upcoming.filter((e) => e.date < t);
  const next = upcoming.filter((e) => e.date >= t).slice(0, 8);

  const subs = db.items.filter((it) => it.kind === 'expense' && isActive(it));
  const stack = subs.slice(0, 3).map((it) => iconHTML(it, 'xs')).join('');
  const name = db.profile.name ? esc(db.profile.name) : 'Hoş geldin';

  return `
  <header class="top">
    <button class="avatar" data-act="settings" aria-label="Ayarlar">${esc((db.profile.name || 'A')[0].toUpperCase())}</button>
    <div class="hello"><small>${greeting()} 👋</small><b>${name}</b></div>
    <button class="icon-btn" data-act="settings" aria-label="Ayarlar">${svg('dots')}</button>
  </header>

  <section class="card hero">
    <div class="hero-top">
      <span class="label">TOPLAM VARLIK</span>
      <button class="pill" data-go="accounts">${db.accounts.length} hesap ${svg('chev', 'chev')}</button>
    </div>
    <div class="big">${bigMoney(total)}</div>
    <div class="hero-bottom">
      <span class="trend ${projected >= total ? 'up' : 'down'}">${projected >= total ? '▲' : '▼'} Ay sonu tahmini<b>${money0(projected)}</b></span>
      ${subs.length ? `<span class="subs"><span class="stack">${stack}</span><small><b>${subs.length}</b> düzenli<br>ödeme</small></span>` : ''}
    </div>
  </section>

  <section class="mini-stats">
    <div class="card mini"><small>${MONTHS[now.getMonth()]} geliri</small><b class="inc">+${money0(inc)}</b></div>
    <div class="card mini"><small>${MONTHS[now.getMonth()]} gideri</small><b>−${money0(exp)}</b></div>
  </section>

  <section class="actions">
    <button class="action" data-act="add"><span class="a-ico" style="--c:#6D5DF6">${svg('plus')}</span>Ekle</button>
    <button class="action" data-go="accounts"><span class="a-ico" style="--c:#16A34A">${svg('bank')}</span>Hesaplar</button>
    <button class="action" data-go="stats"><span class="a-ico" style="--c:#F59E0B">${svg('chart')}</span>Özet</button>
    <button class="action" data-act="ics"><span class="a-ico" style="--c:#0EA5E9">${svg('bell')}</span>Hatırlat</button>
  </section>

  ${overdue.length ? `
  <div class="sec-head"><h2>Bekleyenler</h2><span class="muted">${overdue.length} kayıt</span></div>
  <section class="list">${overdue.map((e) => eventRow(e)).join('')}</section>` : ''}

  <div class="sec-head"><h2>Yaklaşanlar</h2>${db.items.length ? '<button class="pill" data-go="calendar">Takvim ' + svg('chev', 'chev') + '</button>' : ''}</div>
  ${next.length ? `<section class="list">${next.map((e) => eventRow(e)).join('')}</section>`
    : emptyState(db.items.length ? 'Önümüzdeki günlerde bekleyen ödeme ya da gelir yok.' : 'Gelirlerini, aboneliklerini ve faturalarını ekle; ne zaman ne geleceğini ve gideceğini burada gör.', !db.items.length)}
  `;
}

/* ================= Takvim ================= */

function calendarView() {
  const y = ui.calY, m = ui.calM;
  const [ms, me] = monthRange(y, m);
  const evs = events(ms, me);
  const byDay = {};
  for (const e of evs) (byDay[e.date] = byDay[e.date] || []).push(e);
  const t = todayStr();
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const n = lastDay(y, m);
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<span></span>';
  for (let d = 1; d <= n; d++) {
    const ds = ymd(new Date(y, m, d, 12));
    const list = byDay[ds] || [];
    const dots = [...new Set(list.map((e) => (e.it.kind === 'income' ? 'inc' : e.done ? 'done' : 'exp')))]
      .map((k) => `<i class="dot ${k}"></i>`).join('');
    cells += `<button class="day ${ds === t ? 'today' : ''} ${ds === ui.calSel ? 'sel' : ''}" data-day="${ds}">
      <span>${d}</span><span class="dots">${dots}</span></button>`;
  }
  const inc = evs.filter((e) => e.it.kind === 'income').reduce((s, e) => s + e.amount, 0);
  const exp = evs.filter((e) => e.it.kind === 'expense').reduce((s, e) => s + e.amount, 0);

  const sel = ui.calSel >= ms && ui.calSel <= me ? ui.calSel : ms;
  const groups = Object.keys(byDay).filter((d) => d >= sel).sort();
  const listHTML = groups.map((d) => {
    const dd = parse(d);
    const rel = d === t ? 'Bugün' : d === addDays(t, 1) ? 'Yarın' : `${byDay[d].length} kayıt`;
    return `<div class="day-group">
      <div class="dg-head"><h3>${DAYS[dd.getDay()]} ${dd.getDate()} ${MONTHS[dd.getMonth()]}</h3><span class="muted">${rel}</span></div>
      <div class="timeline">${byDay[d].map((e) => `<div class="tl-item"><i class="tl-dot ${e.it.kind === 'income' ? 'inc' : ''} ${e.done ? 'done' : ''}"></i>${eventRow(e, { time: true })}</div>`).join('')}</div>
    </div>`;
  }).join('');

  return `
  <header class="top">
    <h1 class="title">Takvim</h1>
    <div class="nav-btns">
      <button class="icon-btn" data-cal="-1" aria-label="Önceki ay">${svg('chevl')}</button>
      <button class="icon-btn" data-cal="1" aria-label="Sonraki ay">${svg('chev')}</button>
    </div>
  </header>
  <div class="cal-head">
    <h2>${MONTHS[m]} ${y}</h2>
    <div class="cal-sum"><span class="inc">+${money0(inc)}</span><span>−${money0(exp)}</span></div>
  </div>
  <section class="card cal">
    <div class="wk">${DAYS_S.map((d) => `<span>${d}</span>`).join('')}</div>
    <div class="grid">${cells}</div>
    <div class="legend"><span><i class="dot inc"></i>Gelir</span><span><i class="dot exp"></i>Gider</span><span><i class="dot done"></i>Tamamlandı</span></div>
  </section>
  ${listHTML || `<p class="muted center pad">${fmtDateShort(sel)} ve sonrasında bu ay kayıt yok.</p>`}
  `;
}

/* ================= Hesaplar ================= */

function bankCard(a) {
  const b = bankById[a.bank] || bankById.diger;
  const fg = b.dark ? '#14212b' : '#fff';
  const [i, f] = nf.format(Math.abs(a.balance || 0)).split(',');
  return `<button class="bank" data-acc="${a.id}" style="--c1:${b.c1};--c2:${b.c2};--fg:${fg};--ac:${b.accent || 'rgba(255,255,255,.35)'}">
    <span class="bank-name">${esc(a.name || b.name)}</span>
    <span class="chip"></span>
    <span class="bank-bal">${a.balance < 0 ? '−' : ''}${i}<small>,${f}</small> ₺</span>
    <span class="bank-shine"></span>
  </button>`;
}

function accountsView() {
  const total = accountsTotal();
  return `
  <header class="top"><h1 class="title">Hesaplar</h1>
    <button class="icon-btn" data-act="add-acc" aria-label="Hesap ekle">${svg('plus')}</button></header>
  <section class="card hero center">
    <span class="label">TOPLAM VARLIK</span>
    <div class="big">${bigMoney(total)}</div>
    <small class="muted">Bakiyeleri sen girersin. Bir kaydı “ödendi/geldi” yaptığında bağlı hesap kendiliğinden güncellenir.</small>
  </section>
  ${db.accounts.length ? `<section class="banks">${db.accounts.map(bankCard).join('')}
    <button class="bank add" data-act="add-acc">${svg('plus')}<span>Hesap ekle</span></button></section>`
    : `<div class="empty card"><div class="empty-ico">${svg('bank')}</div><p>Banka hesaplarını, nakit paranı ya da altınını ekle; hepsini tek ekranda gör.</p><button class="btn primary" data-act="add-acc">+ Hesap ekle</button></div>`}
  `;
}

/* ================= Özet ================= */

function statsView() {
  const y = ui.statY, m = ui.statM;
  const [ms, me] = monthRange(y, m);
  const evs = events(ms, me);
  const inc = evs.filter((e) => e.it.kind === 'income').reduce((s, e) => s + e.amount, 0);
  const exps = evs.filter((e) => e.it.kind === 'expense');
  const exp = exps.reduce((s, e) => s + e.amount, 0);
  const left = inc - exp;
  const byCat = {};
  for (const e of exps) byCat[e.it.cat] = (byCat[e.it.cat] || 0) + e.amount;
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const base = Math.max(inc, exp) || 1;

  let acc = 0;
  const segs = cats.map(([c, v]) => {
    const from = (acc / base) * 100; acc += v;
    return `${(catById[c] || catById.diger).color} ${from}% ${(acc / base) * 100}%`;
  });
  if (left > 0) segs.push(`var(--save) ${(acc / base) * 100}% 100%`);
  else if (acc / base < 1) segs.push(`var(--track) ${(acc / base) * 100}% 100%`);
  const ring = segs.length ? `conic-gradient(${segs.join(',')})` : 'var(--track)';

  const byItem = {};
  for (const e of exps) {
    const k = e.it.id;
    byItem[k] = byItem[k] || { it: e.it, v: 0, n: 0 };
    byItem[k].v += e.amount; byItem[k].n++;
  }
  const items = Object.values(byItem).sort((a, b) => b.v - a.v);
  const pct = (v) => (inc > 0 ? Math.round((v / inc) * 100) : 0);

  return `
  <header class="top"><h1 class="title">Özet</h1>
    <div class="nav-btns">
      <button class="icon-btn" data-stat="-1" aria-label="Önceki ay">${svg('chevl')}</button>
      <button class="icon-btn" data-stat="1" aria-label="Sonraki ay">${svg('chev')}</button>
    </div></header>
  <div class="cal-head"><h2>${MONTHS[m]} ${y}</h2></div>

  <section class="card donut-card">
    <div class="donut" style="background:${ring}"><div class="donut-in">
      <small>${left >= 0 ? 'Kalan' : 'Açık'}</small><b class="${left >= 0 ? '' : 'neg'}">${money0(Math.abs(left))}</b>
    </div></div>
    <div class="split">
      <div><small>GELİR</small><b class="inc">${money0(inc)}</b></div>
      <div><small>GİDER</small><b>${money0(exp)}</b><em>${inc ? pct(exp) + '%' : ''}</em></div>
      <div><small>BİRİKİM</small><b class="save">${money0(Math.max(left, 0))}</b><em>${inc && left > 0 ? pct(left) + '%' : ''}</em></div>
    </div>
  </section>

  ${cats.length ? `
  <div class="sec-head"><h2>Kategoriler</h2></div>
  <section class="card bars">
    ${cats.map(([c, v]) => { const cat = catById[c] || catById.diger; return `
      <div class="bar-row">
        <span class="ico soft sm" style="--c:${cat.color}">${svg(cat.glyph)}</span>
        <div class="bar-main"><div class="bar-top"><span>${cat.name}</span><b>${money0(v)}</b></div>
          <div class="bar"><i style="width:${Math.max(3, (v / (exp || 1)) * 100)}%;background:${cat.color}"></i></div></div>
      </div>`; }).join('')}
  </section>
  <div class="sec-head"><h2>Kalemler</h2></div>
  <section class="list">${items.map(({ it, v, n }) => `
    <button class="row" data-edit="${it.id}">${iconHTML(it)}
      <span class="row-main"><span class="row-title"><span class="ellipsis">${esc(it.name)}</span></span><span class="row-sub">${esc(repeatLabel(it))}${n > 1 ? ` · bu ay ${n} kez` : ''}</span></span>
      <span class="row-amt"><b>${money(v)}</b><small>${inc ? pct(v) + '% gelirin' : ''}</small></span>
    </button>`).join('')}</section>`
    : emptyState('Bu ay için gider kaydı yok.', !db.items.length)}
  `;
}

/* ================= Alt sayfa (sheet) ================= */

function openSheet(html, onMount) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="backdrop"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div class="sheet-body">${html}</div></div>`;
  root.classList.add('open');
  document.body.classList.add('locked');
  requestAnimationFrame(() => root.classList.add('show'));
  $('.backdrop', root).onclick = closeSheet;
  $$('.amount-in input', root).forEach(fitAmount);
  if (onMount) onMount($('.sheet-body', root));
}

function closeSheet() {
  const root = $('#sheet-root');
  root.classList.remove('show');
  document.body.classList.remove('locked');
  setTimeout(() => { root.classList.remove('open'); root.innerHTML = ''; }, 260);
}

function setSheet(html, onMount) {
  const body = $('#sheet-root .sheet-body');
  if (!body) return openSheet(html, onMount);
  body.innerHTML = html;
  body.scrollTop = 0;
  $$('.amount-in input', body).forEach(fitAmount);
  if (onMount) onMount(body);
}

const sheetHead = (title, back) => `<div class="sh-head">
  ${back ? `<button class="icon-btn" data-back aria-label="Geri">${svg('chevl')}</button>` : '<span class="sp"></span>'}
  <h2>${title}</h2>
  <button class="icon-btn" data-close aria-label="Kapat">${svg('x')}</button></div>`;

function wireHead(body, back) {
  const c = $('[data-close]', body); if (c) c.onclick = closeSheet;
  const b = $('[data-back]', body); if (b && back) b.onclick = back;
}

/* ---------- Ekleme akışı ---------- */

const norm = (s) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');

function addFlow(kind = 'expense') {
  const cats = CATEGORIES.filter((c) => c.kind === kind);
  const html = `${sheetHead('Yeni kayıt')}
    <div class="seg" role="tablist">
      <button class="${kind === 'expense' ? 'on' : ''}" data-kind="expense">Gider</button>
      <button class="${kind === 'income' ? 'on' : ''}" data-kind="income">Gelir</button>
    </div>
    <label class="search">${svg('search')}<input type="search" placeholder="${kind === 'expense' ? 'Netflix, Turkcell, kira…' : 'Maaş, burs, harçlık…'}" autocomplete="off"></label>
    <div class="results"></div>
    <div class="cat-grid">${cats.map((c) => `
      <button class="cat" data-cat="${c.id}"><span class="ico soft lg" style="--c:${c.color}">${svg(c.glyph)}</span><span>${c.name}</span></button>`).join('')}
    </div>`;
  setSheet(html, (body) => {
    wireHead(body);
    $$('[data-kind]', body).forEach((b) => (b.onclick = () => addFlow(b.dataset.kind)));
    $$('[data-cat]', body).forEach((b) => (b.onclick = () => servicePicker(b.dataset.cat)));
    const input = $('.search input', body);
    const res = $('.results', body);
    const grid = $('.cat-grid', body);
    input.oninput = () => {
      const q = norm(input.value.trim());
      if (!q) { res.innerHTML = ''; grid.hidden = false; return; }
      const hits = SERVICES.filter((s) => catById[s.cat].kind === kind && norm(s.name).includes(q)).slice(0, 12);
      grid.hidden = true;
      res.innerHTML = `<div class="svc-grid">${hits.map((s) => svcTile(s)).join('')}
        <button class="svc custom" data-custom="${esc(input.value.trim())}"><span class="ico soft lg" style="--c:#6D5DF6">${svg('plus')}</span><span>“${esc(input.value.trim())}” ekle</span></button></div>`;
      wireTiles(res, kind === 'expense' ? 'diger' : 'gelirdiger');
    };
  });
}

const svcTile = (s) => `<button class="svc" data-svc="${SERVICES.indexOf(s)}">${iconHTML(s, 'lg')}<span>${esc(s.name)}</span></button>`;

function wireTiles(el, cat) {
  $$('[data-svc]', el).forEach((b) => (b.onclick = () => {
    const s = SERVICES[+b.dataset.svc];
    itemForm({ cat: s.cat, name: s.name, color: s.color, logo: s.logo, glyph: s.glyph, abbr: s.abbr, bg: s.bg, dark: s.dark }, () => servicePicker(s.cat));
  }));
  $$('[data-custom]', el).forEach((b) => (b.onclick = () => {
    const c = catById[cat];
    itemForm({ cat, name: b.dataset.custom, color: c.color, glyph: c.glyph }, () => (b.dataset.custom ? addFlow(c.kind) : servicePicker(cat)));
  }));
}

function servicePicker(catId) {
  const c = catById[catId];
  const list = SERVICES.filter((s) => s.cat === catId);
  setSheet(`${sheetHead(c.name, true)}
    <div class="svc-grid">${list.map(svcTile).join('')}
      <button class="svc custom" data-custom=""><span class="ico soft lg" style="--c:${c.color}">${svg('plus')}</span><span>Özel ekle</span></button>
    </div>`, (body) => {
    wireHead(body, () => addFlow(c.kind));
    wireTiles(body, catId);
  });
}

/* ---------- Kayıt formu ---------- */

function itemForm(base, back) {
  const editing = !!base.id;
  const it = editing ? base : Object.assign({ kind: catById[base.cat].kind, amount: '', start: todayStr(), unit: 'month', n: 1, count: null, account: '', note: '' }, base);
  const inc = it.kind === 'income';
  const rep = repeatOf(it).id;
  const accOpts = db.accounts.map((a) => `<option value="${a.id}" ${a.id === it.account ? 'selected' : ''}>${esc(a.name || bankById[a.bank]?.name)}</option>`).join('');

  setSheet(`${sheetHead(editing ? 'Kaydı düzenle' : inc ? 'Gelir ekle' : 'Gider ekle', !!back)}
    <form class="form" autocomplete="off">
      <div class="form-hero">
        <span class="fh-ico">${iconHTML(it, 'lg')}</span>
        <input class="name-in" name="name" value="${esc(it.name)}" placeholder="Ad" required maxlength="40">
        <small class="muted">${catById[it.cat].name}</small>
      </div>
      <label class="amount-box">
        <span>${inc ? 'Gelecek tutar' : 'Tutar'}</span>
        <div class="amount-in"><input name="amount" inputmode="decimal" placeholder="0" value="${it.amount !== '' ? String(it.amount).replace('.', ',') : ''}" required><b>₺</b></div>
      </label>
      <div class="field"><span>${it.unit === 'once' ? 'Tarih' : 'İlk / sıradaki tarih'}</span><input type="date" name="start" value="${it.start}" required></div>
      <div class="field col"><span>Tekrar</span>
        <div class="chips">${REPEATS.map((r) => `<button type="button" class="chip-btn ${r.id === rep ? 'on' : ''}" data-rep="${r.id}">${r.label}</button>`).join('')}</div>
      </div>
      <div class="field count-field" ${rep === 'once' ? 'hidden' : ''}><span>Kaç kez?</span>
        <div class="count"><input name="count" inputmode="numeric" placeholder="Süresiz" value="${it.count || ''}"><small>taksit / parça sayısı</small></div></div>
      <div class="field"><span>${inc ? 'Yatacağı hesap' : 'Çıkacağı hesap'}</span>
        <select name="account"><option value="">Seçme</option>${accOpts}</select></div>
      <div class="field"><span>Not</span><input name="note" value="${esc(it.note)}" placeholder="İsteğe bağlı" maxlength="80"></div>
      <button class="btn primary block" type="submit">${editing ? 'Kaydet' : 'Ekle'}</button>
      ${editing ? `<div class="danger-row">
        ${it.unit !== 'once' ? `<button type="button" class="btn ghost" data-stop>${it.until ? 'Yeniden başlat' : 'Bugünden sonra bitir'}</button>` : ''}
        <button type="button" class="btn ghost red" data-del>Sil</button></div>` : ''}
    </form>`, (body) => {
    wireHead(body, back);
    const form = $('form', body);
    let repSel = rep;
    $$('[data-rep]', body).forEach((b) => (b.onclick = () => {
      repSel = b.dataset.rep;
      $$('[data-rep]', body).forEach((x) => x.classList.toggle('on', x === b));
      $('.count-field', body).hidden = repSel === 'once';
    }));
    if (!editing) setTimeout(() => form.amount.focus(), 280);
    form.onsubmit = (ev) => {
      ev.preventDefault();
      const amount = parseAmount(form.amount.value);
      if (!(amount > 0)) { toast('Geçerli bir tutar gir'); form.amount.focus(); return; }
      const r = REPEATS.find((x) => x.id === repSel);
      const count = parseInt(form.count.value, 10);
      const out = Object.assign(it, {
        name: form.name.value.trim() || it.name,
        amount, start: form.start.value || todayStr(),
        unit: r.unit, n: r.n, count: r.unit !== 'once' && count > 0 ? count : null,
        account: form.account.value, note: form.note.value.trim(),
      });
      if (!editing) { out.id = uid(); out.done = {}; db.items.push(out); }
      save(); closeSheet(); render();
      toast(editing ? 'Kaydedildi' : `${out.name} eklendi`);
    };
    const del = $('[data-del]', body);
    if (del) del.onclick = () => {
      if (!confirm(`“${it.name}” ve tüm tekrarları silinsin mi?`)) return;
      db.items = db.items.filter((x) => x.id !== it.id);
      save(); closeSheet(); render(); toast('Silindi');
    };
    const stop = $('[data-stop]', body);
    if (stop) stop.onclick = () => {
      it.until = it.until ? null : todayStr();
      save(); closeSheet(); render();
      toast(it.until ? 'Bugünden sonraki tekrarlar kaldırıldı' : 'Yeniden başlatıldı');
    };
  });
}

/* ---------- Tek bir ödeme/gelir ---------- */

function occSheet(id, date) {
  const it = db.items.find((x) => x.id === id);
  if (!it) return;
  const inc = it.kind === 'income';
  const done = !!(it.done && it.done[date]);
  const amount = amountOn(it, date);
  const acc = db.accounts.find((a) => a.id === it.account);
  const nd = occurrences(it, addDays(date, 1), addDays(date, 800))[0];
  const e = { it, date, amount, done };

  openSheet(`${sheetHead('')}
    <div class="occ">
      ${iconHTML(it, 'xl')}
      <h2>${esc(it.name)}</h2>
      <div class="occ-amt ${inc ? 'inc' : ''}">${inc ? '+' : '−'}${money(amount)}</div>
      <div class="occ-meta">${badgeFor(e)}<span>${DAYS[parse(date).getDay()]}, ${fmtDate(date)}</span></div>
      <dl>
        <div><dt>Tekrar</dt><dd>${esc(repeatLabel(it))}</dd></div>
        <div><dt>Hesap</dt><dd>${acc ? esc(acc.name || bankById[acc.bank]?.name) : '—'}</dd></div>
        ${nd ? `<div><dt>Sonraki</dt><dd>${fmtDate(nd)}</dd></div>` : ''}
        ${it.note ? `<div><dt>Not</dt><dd>${esc(it.note)}</dd></div>` : ''}
      </dl>
      <label class="field"><span>Bu seferki tutar</span><div class="amount-in sm"><input data-ov inputmode="decimal" value="${String(amount).replace('.', ',')}"><b>₺</b></div></label>
      <button class="btn ${done ? 'ghost' : 'primary'} block" data-toggle>${done ? 'İşareti kaldır' : inc ? '✓ Geldi olarak işaretle' : '✓ Ödendi olarak işaretle'}</button>
      ${acc && !done ? `<small class="muted">${esc(acc.name || bankById[acc.bank]?.name)} bakiyesi ${inc ? 'artırılacak' : 'azaltılacak'}.</small>` : ''}
      <button class="btn ghost block" data-edit-it>Kaydı düzenle</button>
    </div>`, (body) => {
    wireHead(body);
    const ov = $('[data-ov]', body);
    ov.onchange = () => {
      const v = parseAmount(ov.value);
      if (!(v > 0)) { ov.value = String(amount).replace('.', ','); return; }
      it.overrides = it.overrides || {};
      if (v === it.amount) delete it.overrides[date]; else it.overrides[date] = v;
      if (done && acc) acc.balance = round2(acc.balance + (inc ? v - amount : amount - v));
      save(); render(); toast('Bu seferki tutar güncellendi');
    };
    $('[data-toggle]', body).onclick = () => {
      it.done = it.done || {};
      const cur = amountOn(it, date);
      if (done) {
        delete it.done[date];
        if (acc) acc.balance = round2(acc.balance - (inc ? cur : -cur));
      } else {
        it.done[date] = true;
        if (acc) acc.balance = round2(acc.balance + (inc ? cur : -cur));
      }
      save(); closeSheet(); render();
      toast(done ? 'İşaret kaldırıldı' : inc ? 'Geldi 🎉' : 'Ödendi ✓');
    };
    $('[data-edit-it]', body).onclick = () => itemForm(it);
  });
}

const round2 = (v) => Math.round(v * 100) / 100;

/* ---------- Hesap ekle / düzenle ---------- */

function bankPicker() {
  openSheet(`${sheetHead('Hesap ekle')}
    <div class="bank-pick">${BANKS.map((b) => `<button data-bank="${b.id}" style="--c1:${b.c1};--c2:${b.c2};--fg:${b.dark ? '#14212b' : '#fff'}"><span>${esc(b.name)}</span></button>`).join('')}</div>`, (body) => {
    wireHead(body);
    $$('[data-bank]', body).forEach((b) => (b.onclick = () => accountForm({ bank: b.dataset.bank }, bankPicker)));
  });
}

function accountForm(base, back) {
  const editing = !!base.id;
  const a = editing ? base : Object.assign({ name: '', balance: '' }, base);
  const b = bankById[a.bank] || bankById.diger;
  setSheet(`${sheetHead(editing ? 'Hesabı düzenle' : b.name, !!back)}
    <form class="form" autocomplete="off">
      <div class="bank preview" style="--c1:${b.c1};--c2:${b.c2};--fg:${b.dark ? '#14212b' : '#fff'};--ac:${b.accent || 'rgba(255,255,255,.35)'}"><span class="bank-name">${esc(a.name || b.name)}</span><span class="chip"></span><span class="bank-bal">Bakiye</span><span class="bank-shine"></span></div>
      <div class="field"><span>Hesap adı</span><input name="name" value="${esc(a.name)}" placeholder="${esc(b.name)}" maxlength="30"></div>
      <label class="amount-box"><span>Güncel bakiye</span>
        <div class="amount-in"><input name="balance" inputmode="decimal" placeholder="0" value="${a.balance !== '' ? String(a.balance).replace('.', ',') : ''}"><b>₺</b></div>
        <small class="muted">Kredi kartı borcu için başına eksi (−) koyabilirsin.</small></label>
      <button class="btn primary block" type="submit">${editing ? 'Kaydet' : 'Hesabı ekle'}</button>
      ${editing ? '<button type="button" class="btn ghost red block" data-del>Hesabı sil</button>' : ''}
    </form>`, (body) => {
    wireHead(body, back);
    const form = $('form', body);
    setTimeout(() => form.balance.focus(), 280);
    form.onsubmit = (ev) => {
      ev.preventDefault();
      const raw = form.balance.value.trim().replace(/^[−–]/, '-');
      const v = raw ? parseAmount(raw) : 0;
      if (!Number.isFinite(v)) { toast('Geçerli bir bakiye gir'); return; }
      Object.assign(a, { name: form.name.value.trim(), balance: v });
      if (!editing) { a.id = uid(); db.accounts.push(a); }
      save(); closeSheet(); render(); toast('Hesap kaydedildi');
    };
    const del = $('[data-del]', body);
    if (del) del.onclick = () => {
      if (!confirm('Bu hesap silinsin mi? Kayıtların silinmez.')) return;
      db.accounts = db.accounts.filter((x) => x.id !== a.id);
      db.items.forEach((it) => { if (it.account === a.id) it.account = ''; });
      save(); closeSheet(); render(); toast('Hesap silindi');
    };
  });
}

/* ---------- Ayarlar ---------- */

function settings() {
  const p = db.profile;
  openSheet(`${sheetHead('Ayarlar')}
    <form class="form" onsubmit="return false">
      <div class="field"><span>Adın</span><input name="name" value="${esc(p.name)}" placeholder="Adın" maxlength="24"></div>
      <div class="field col"><span>Görünüm</span>
        <div class="seg">${[['system', 'Sistem'], ['light', 'Açık'], ['dark', 'Koyu']].map(([k, l]) => `<button type="button" data-theme="${k}" class="${p.theme === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    </form>
    <div class="set-list">
      <button data-act="ics">${svg('bell')}<span><b>iPhone takvimine aktar</b><small>Her ödeme ve gelir için hatırlatma kurulur</small></span></button>
      <button data-act="export">${svg('receipt')}<span><b>Yedek indir</b><small>Tüm verini dosya olarak kaydet</small></span></button>
      <label>${svg('cloud')}<span><b>Yedekten geri yükle</b><small>Daha önce indirdiğin dosyayı seç</small></span><input type="file" accept="application/json,.json" hidden data-import></label>
      <button data-act="reset" class="red">${svg('x')}<span><b>Tüm verileri sil</b><small>Bu cihazdaki her şey silinir</small></span></button>
    </div>
    <p class="muted small center">Verilerin yalnızca bu cihazda, tarayıcının içinde saklanır; hiçbir sunucuya gönderilmez.</p>`, (body) => {
    wireHead(body);
    const name = $('[name=name]', body);
    name.oninput = () => { p.name = name.value.trim(); save(); };
    name.onblur = render;
    $$('[data-theme]', body).forEach((b) => (b.onclick = () => {
      p.theme = b.dataset.theme; save(); applyTheme();
      $$('[data-theme]', body).forEach((x) => x.classList.toggle('on', x === b));
    }));
    $('[data-import]', body).onchange = (ev) => importBackup(ev.target.files[0]);
  });
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function exportBackup() {
  download(`akis-yedek-${todayStr()}.json`, JSON.stringify(db, null, 2), 'application/json');
  toast('Yedek indirildi');
}

function importBackup(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.items) || !Array.isArray(d.accounts)) throw new Error('bad');
      if (!confirm('Mevcut verilerin yedekteki verilerle değiştirilsin mi?')) return;
      db = Object.assign(blank(), d);
      save(); applyTheme(); closeSheet(); render(); toast('Yedek yüklendi');
    } catch (e) {
      toast('Bu dosya bir Akış yedeği değil');
    }
  };
  r.readAsText(file);
}

/* ---------- Takvime aktarma (.ics) ---------- */

function icsText(s) { return String(s).replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n'); }

function buildICS() {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Akis//TR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Akış – Ödemeler'];
  const t = todayStr();
  let n = 0;
  for (const it of db.items) {
    const [first] = occurrences(it, addDays(t, -1), addDays(t, 800));
    if (!first) continue;
    const inc = it.kind === 'income';
    const dt = first.replace(/-/g, '');
    const nextDay = addDays(first, 1).replace(/-/g, '');
    let rule = '';
    if (it.unit !== 'once') {
      const freq = { week: 'WEEKLY', month: 'MONTHLY', year: 'YEARLY' }[it.unit];
      rule = `RRULE:FREQ=${freq};INTERVAL=${it.n}`;
      const day = parse(it.start).getDate();
      if (it.unit === 'month' && day > 28) {
        const days = []; for (let k = 28; k <= day; k++) days.push(k);
        rule += `;BYMONTHDAY=${days.join(',')};BYSETPOS=-1`;
      }
      if (it.count) {
        const doneBefore = occurrences(it, it.start, addDays(first, -1)).length;
        rule += `;COUNT=${Math.max(1, it.count - doneBefore)}`;
      } else if (it.until) {
        rule += `;UNTIL=${it.until.replace(/-/g, '')}`;
      }
    }
    lines.push('BEGIN:VEVENT', `UID:${it.id}@akis`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dt}`, `DTEND;VALUE=DATE:${nextDay}`,
      `SUMMARY:${icsText(`${inc ? '💰 ' : '💸 '}${it.name} ${inc ? '+' : '−'}${money(it.amount)}`)}`,
      `DESCRIPTION:${icsText(`${inc ? 'Gelir' : 'Ödeme'} · ${repeatLabel(it)}${it.note ? ' · ' + it.note : ''}`)}`);
    if (rule) lines.push(rule);
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(it.name)}`, 'TRIGGER:-PT15H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(it.name)}`, 'TRIGGER:PT9H', 'END:VALARM', 'END:VEVENT');
    n++;
  }
  lines.push('END:VCALENDAR');
  return { text: lines.join('\r\n'), n };
}

function exportICS() {
  const { text, n } = buildICS();
  if (!n) { toast('Önce bir kayıt ekle'); return; }
  openSheet(`${sheetHead('Hatırlatmalar')}
    <div class="occ">
      <span class="ico soft xl" style="--c:#0EA5E9">${svg('bell')}</span>
      <h2>iPhone takvimine aktar</h2>
      <p class="muted">${n} kaydın tekrarlarıyla birlikte takvimine eklenir. Her biri için <b>bir gün önce 09:00</b>'da ve <b>o gün 09:00</b>'da bildirim gelir.</p>
      <button class="btn primary block" data-dl>Takvim dosyasını indir</button>
      <ol class="steps">
        <li>Dosya inince <b>“Tümünü ekle”</b>ye dokun.</li>
        <li>Yeni kayıt ekledikten sonra bu adımı tekrarlarsan aynı kayıtlar güncellenir.</li>
        <li>Ana ekrandaki uygulamada indirme açılmazsa bu sayfayı Safari'de açıp dene.</li>
      </ol>
    </div>`, (body) => {
    wireHead(body);
    $('[data-dl]', body).onclick = () => download('akis-odemeler.ics', text, 'text/calendar');
  });
}

/* ================= Olaylar ================= */

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-go],[data-act],[data-occ],[data-day],[data-cal],[data-stat],[data-acc],[data-edit]');
  if (!el) return;
  const d = el.dataset;
  if (d.go) return go(d.go);
  if (d.occ) { const [id, date] = d.occ.split('|'); return occSheet(id, date); }
  if (d.edit) { const it = db.items.find((x) => x.id === d.edit); return it && openSheet('', () => itemForm(it)); }
  if (d.day) { ui.calSel = d.day; return render(); }
  if (d.cal) {
    ui.calM += +d.cal;
    if (ui.calM < 0) { ui.calM = 11; ui.calY--; } else if (ui.calM > 11) { ui.calM = 0; ui.calY++; }
    const t = todayStr();
    const [ms, me] = monthRange(ui.calY, ui.calM);
    ui.calSel = t >= ms && t <= me ? t : ms;
    return render();
  }
  if (d.stat) {
    ui.statM += +d.stat;
    if (ui.statM < 0) { ui.statM = 11; ui.statY--; } else if (ui.statM > 11) { ui.statM = 0; ui.statY++; }
    return render();
  }
  if (d.acc) { const a = db.accounts.find((x) => x.id === d.acc); return a && openSheet('', () => accountForm(a)); }
  switch (d.act) {
    case 'add': return openSheet('', () => addFlow('expense'));
    case 'add-acc': return bankPicker();
    case 'settings': return settings();
    case 'ics': return exportICS();
    case 'export': return exportBackup();
    case 'reset':
      if (confirm('Tüm hesapların ve kayıtların silinsin mi? Bu geri alınamaz.')) {
        db = blank(); save(); applyTheme(); closeSheet(); go('home'); toast('Tüm veriler silindi');
      }
      return;
  }
});

$$('.tabbar [data-tab]').forEach((b) => (b.onclick = () => go(b.dataset.tab)));
$('.tab-add').onclick = () => openSheet('', () => addFlow('expense'));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#sheet-root.open')) closeSheet(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

// Gün değişince (uygulama arka planda açık kalırsa) yenile
let lastDay_ = todayStr();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && todayStr() !== lastDay_) { lastDay_ = todayStr(); render(); }
});

applyTheme();
render();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
