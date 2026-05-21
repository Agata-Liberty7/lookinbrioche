// ─── Storage ────────────────────────────────────────────────────────────────
const DB = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k => localStorage.removeItem(k),
};

// ─── Settings ───────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  shopName: 'Пирожковая',
  currency: 'RUB',
  currencySymbol: '₽',
  currencyPos: 'after',
  logo: null,
  stripeKey: '',
  adminPassword: 'admin123',
  bizumNumber: '',
  revolutHandle: '',
  invoiceDetails: '',
};

function getSettings() { return Object.assign({}, DEFAULT_SETTINGS, DB.get('settings') || {}); }
function saveSettings(s) { DB.set('settings', s); }

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
  { id:1, name:'Pirozhki s kapustoy', price:45, unit:'sht', category:'Pirozhki', available:true, minQty:1, photo:null },
  { id:2, name:'Pirozhki s myasom',   price:55, unit:'sht', category:'Pirozhki', available:true, minQty:1, photo:null },
  { id:3, name:'Belyashi',            price:65, unit:'sht', category:'Pirozhki', available:true, minQty:5, photo:null },
  { id:4, name:'Pirog s vishney',     price:350, unit:'kg', category:'Pirogi',  available:true, minQty:1, photo:null },
  { id:5, name:'Shangi tvorozhnye',   price:50, unit:'sht', category:'Vypechka',available:true, minQty:3, photo:null },
  { id:6, name:'Chak-chak',           price:280, unit:'kg', category:'Sladosti',available:true, minQty:0.5, photo:null },
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
  { id:1, login:'client1', password:'pass1', name:'Иван Петров',     discount:0,  coeff:1.0, group:'retail' },
  { id:2, login:'opt',     password:'opt123', name:'ООО Опторг',      discount:10, coeff:0.9, group:'wholesale' },
  { id:3, login:'vip',     password:'vip999', name:'VIP-клиент',      discount:20, coeff:0.8, group:'vip' },
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

// Apply client price
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
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(() => {}); }
