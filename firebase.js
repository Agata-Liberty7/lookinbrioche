// ─── Firebase config ─────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, collection,
  getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy,
  increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIp_IwWv3GzIQVi0HySX_1LBiugtaXcf4",
  authDomain: "pirozhki-52681.firebaseapp.com",
  projectId: "pirozhki-52681",
  storageBucket: "pirozhki-52681.firebasestorage.app",
  messagingSenderId: "754207776913",
  appId: "1:754207776913:web:9567388234d15e217b1f30",
  measurementId: "G-45BMX96W0B"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ─── Helper: single doc ──────────────────────────────────────────────────────
async function getDocData(path) {
  const snap = await getDoc(doc(db, path));
  return snap.exists() ? snap.data() : null;
}

async function setDocData(path, data) {
  await setDoc(doc(db, path), data, { merge: true });
}

// ─── Settings ─────────────────────────────────────────────────────────────────
export async function fbGetSettings() {
  return await getDocData('config/settings');
}
export async function fbSaveSettings(data) {
  await setDocData('config/settings', data);
}

// ─── Catalog ──────────────────────────────────────────────────────────────────
export async function fbGetCatalog() {
  const snap = await getDocs(collection(db, 'catalog'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function fbSaveProduct(product) {
  const { id, ...data } = product;
  if (id && typeof id === 'string' && id.length > 5) {
    await setDoc(doc(db, 'catalog', id), data, { merge: true });
    return id;
  } else {
    const ref = await addDoc(collection(db, 'catalog'), data);
    return ref.id;
  }
}
export async function fbDeleteProduct(id) {
  await deleteDoc(doc(db, 'catalog', String(id)));
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function fbGetOrders() {
  const q = query(collection(db, 'orders'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function fbAddOrder(order) {
  const { id, ...data } = order;
  const ref = await addDoc(collection(db, 'orders'), data);
  return ref.id;
}
export async function fbUpdateOrder(id, data) {
  await updateDoc(doc(db, 'orders', String(id)), data);
}
export async function fbDeleteOrder(id) {
  await deleteDoc(doc(db, 'orders', String(id)));
}
export function fbListenOrders(callback) {
  const q = query(collection(db, 'orders'), orderBy('date', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export async function fbGetClients() {
  const snap = await getDocs(collection(db, 'clients'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function fbSaveClient(client) {
  const { id, ...data } = client;
  if (id && typeof id === 'string' && id.length > 5) {
    await setDoc(doc(db, 'clients', id), data, { merge: true });
    return id;
  } else {
    const ref = await addDoc(collection(db, 'clients'), data);
    return ref.id;
  }
}
export async function fbDeleteClient(id) {
  await deleteDoc(doc(db, 'clients', String(id)));
}
export async function fbFindClient(login, password) {
  const clients = await fbGetClients();
  return clients.find(c => c.login === login && c.password === password) || null;
}

export async function fbRecordClientLogin(clientId) {
  if (!clientId) return;
  await updateDoc(doc(db, 'clients', String(clientId)), {
    lastLoginAt: serverTimestamp(),
    loginCount: increment(1)
  });
}

export async function fbRecordClientVisit(clientId) {
  if (!clientId) return;
  await updateDoc(doc(db, 'clients', String(clientId)), {
    lastVisitAt: serverTimestamp(),
    visitCount: increment(1)
  });
}
