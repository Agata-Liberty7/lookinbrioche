// ─── Storage ────────────────────────────────────────────────────────────────
const DB = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k => localStorage.removeItem(k),
};

// ─── Settings ───────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  shopName: 'Пирожковая',
  shopTagline: 'Свежая выпечка каждый день',
  currency: 'EUR',
  logo: null,
  stripeKey: '',
  adminPassword: 'admin123',
  bizumNumber: '',
  revolutHandle: '',
  invoiceDetails: '',
  fontFamily: 'PT Sans',
  darkMode: 'system', // 'light' | 'dark' | 'system'
};

function getSettings() { return Object.assign({}, DEFAULT_SETTINGS, DB.get('settings') || {}); }
function saveSettings(s) { DB.set('settings', s); }

// ─── Theme ───────────────────────────────────────────────────────────────────
function applyTheme() {
  const s = getSettings();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = s.darkMode === 'dark' || (s.darkMode === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
}

// ─── Font ─────────────────────────────────────────────────────────────────────
function applyFont() {
  const s = getSettings();
  document.documentElement.style.setProperty('--font-body', s.fontFamily || 'PT Sans');
}

// ─── Currency formatting ─────────────────────────────────────────────────────
const CURRENCIES = {
  RUB: { symbol: '₽', pos: 'after',  locale: 'ru-RU' },
  EUR: { symbol: '€', pos: 'after',  locale: 'es-ES' },
  USD: { symbol: '$', pos: 'before', locale: 'en-US' },
  GBP: { symbol: '£', pos: 'before', locale: 'en-GB' },
  KZT: { symbol: '₸', pos: 'after',  locale: 'kk-KZ' },
};

function formatPrice(n) {
  const s = getSettings();
  const cur = CURRENCIES[s.currency] || CURRENCIES['EUR'];
  const num = new Intl.NumberFormat(cur.locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  return cur.pos === 'before' ? cur.symbol + num : num + '\u00a0' + cur.symbol;
}

// ─── Default catalog ─────────────────────────────────────────────────────────
const DEFAULT_CATALOG = [
  { id:1, name:'Barra brioche', price:4.5, unit:'sht', category:'Pan', available:true, minQty:1, photo:null,
    description:'Pan brioche artesano, suave y tierno',
    ingredients:'Masa madre, harina de trigo fuerza, leche, mantequilla, azúcar, sal, yema de huevo. ¡Sin levadura!' },
  { id:2, name:'Piroski de carne', price:2.5, unit:'sht', category:'Piroski', available:true, minQty:5, photo:null, description:'', ingredients:'' },
  { id:3, name:'Piroski de col', price:2.0, unit:'sht', category:'Piroski', available:true, minQty:5, photo:null, description:'', ingredients:'' },
  { id:4, name:'Tarta de cereza', price:18, unit:'kg', category:'Tartas', available:true, minQty:0.5, photo:null, description:'', ingredients:'' },
];

function getCatalog() { return DB.get('catalog') || DEFAULT_CATALOG; }
function saveCatalog(c) { DB.set('catalog', c); }

// ─── Orders ──────────────────────────────────────────────────────────────────
function getOrders() { return DB.get('orders') || []; }
function saveOrders(o) { DB.set('orders', o); }

// ─── Cart ────────────────────────────────────────────────────────────────────
function getCart() { return DB.get('cart') || []; }
function saveCart(c) { DB.set('cart', c); }

// ─── Auth ─────────────────────────────────────────────────────────────────────
const DEFAULT_CLIENTS = [
  { id:1, login:'client1', password:'pass1', name:'Cliente 1', discount:0,  coeff:1.0, group:'retail' },
  { id:2, login:'opt',     password:'opt123', name:'Mayorista', discount:10, coeff:0.9, group:'wholesale' },
  { id:3, login:'vip',     password:'vip999', name:'VIP',       discount:20, coeff:0.8, group:'vip' },
];

function getClients() { return DB.get('clients') || DEFAULT_CLIENTS; }
function saveClients(c) { DB.set('clients', c); }
function getCurrentUser() { return DB.get('currentUser') || null; }
function setCurrentUser(u) { DB.set('currentUser', u); }
function clearCurrentUser() { DB.del('currentUser'); }

function loginUser(login, password) {
  if (!login && !password) { setCurrentUser({ guest: true, name: 'Guest', discount: 0, coeff: 1 }); return true; }
  const clients = getClients();
  const client = clients.find(c => c.login === login && c.password === password);
  if (client) { setCurrentUser(client); return true; }
  return false;
}

function loginAdmin(password) {
  const s = getSettings();
  return password === s.adminPassword;
}

function clientPrice(basePrice) {
  const user = getCurrentUser();
  if (!user) return basePrice;
  return Math.round(basePrice * (user.coeff || 1) * (1 - (user.discount || 0) / 100) * 100) / 100;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, duration = 2200) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), duration);
}

// ─── Service Worker ───────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/pirozhki/sw.js').catch(() => {}); }
