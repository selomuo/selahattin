'use strict';

// Hesaplar ve veri saklama.
// config.js içinde Firebase ayarı varsa hesaplar bulutta (her cihazdan giriş, veri kaybolmaz),
// yoksa hesaplar yalnızca bu cihazda tutulur. Her iki durumda da herkes yalnızca kendi verisini görür.

const LEGACY_KEY = 'akis.v1';
const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;
const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

class AuthError extends Error {}

const normUser = (u) => String(u || '').trim().toLowerCase();

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

function removeKey(key) {
  try { localStorage.removeItem(key); } catch (e) { /* depolama kapalı */ }
}

// Hesaplardan önceki sürümde girilen veriler, bu cihazda açılan ilk hesaba taşınır
function takeLegacy() {
  const data = readJSON(LEGACY_KEY);
  if (data) removeKey(LEGACY_KEY);
  return data;
}

const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

function randomHex(bytes) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a);
}

function checkCredentials(name, password) {
  if (!USERNAME_RE.test(name)) {
    throw new AuthError('Kullanıcı adı 3-20 karakter olmalı. Türkçe karakter ve boşluk olmadan harf, rakam, nokta, tire veya alt çizgi kullanabilirsin.');
  }
  if (String(password || '').length < 6) throw new AuthError('Şifre en az 6 karakter olmalı.');
}

async function hashPassword(password, saltHex) {
  if (!window.crypto || !crypto.subtle) throw new AuthError('Şifreleme için sayfanın https adresinden açılması gerekiyor.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, key, 256);
  return toHex(bits);
}

/* ---------- Cihaz içi hesaplar ---------- */

const LocalBackend = {
  mode: 'local',
  user: null,

  accounts() {
    return readJSON('akis.accounts') || {};
  },

  async init() {
    const id = readJSON('akis.session');
    const accounts = this.accounts();
    const name = Object.keys(accounts).find((n) => accounts[n].id === id);
    this.user = name ? { id, name } : null;
    return this.user;
  },

  async register(username, password) {
    const name = normUser(username);
    checkCredentials(name, password);
    const accounts = this.accounts();
    if (accounts[name]) throw new AuthError('Bu kullanıcı adı alınmış.');
    const salt = randomHex(16);
    const id = randomHex(8);
    accounts[name] = { id, salt, hash: await hashPassword(password, salt) };
    if (!writeJSON('akis.accounts', accounts)) throw new AuthError('Cihaz depolaması kullanılamıyor.');
    const legacy = takeLegacy();
    if (legacy) writeJSON('akis.u.' + id, legacy);
    writeJSON('akis.session', id);
    this.user = { id, name };
    return this.user;
  },

  async login(username, password) {
    const name = normUser(username);
    const acc = this.accounts()[name];
    if (!acc || (await hashPassword(String(password || ''), acc.salt)) !== acc.hash) {
      throw new AuthError('Kullanıcı adı veya şifre hatalı.');
    }
    writeJSON('akis.session', acc.id);
    this.user = { id: acc.id, name };
    return this.user;
  },

  async logout() {
    removeKey('akis.session');
    this.user = null;
  },

  async loadState() {
    return readJSON('akis.u.' + this.user.id);
  },

  save(state) {
    return writeJSON('akis.u.' + this.user.id, state);
  },

  async flush() {},
};

/* ---------- Firebase ile bulut hesapları ---------- */

function firebaseMessage(e) {
  const code = (e && e.code) || '';
  const map = {
    'auth/email-already-in-use': 'Bu kullanıcı adı alınmış.',
    'auth/invalid-credential': 'Kullanıcı adı veya şifre hatalı.',
    'auth/invalid-login-credentials': 'Kullanıcı adı veya şifre hatalı.',
    'auth/wrong-password': 'Kullanıcı adı veya şifre hatalı.',
    'auth/user-not-found': 'Kullanıcı adı veya şifre hatalı.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.',
    'auth/network-request-failed': 'İnternet bağlantısı yok.',
    'auth/operation-not-allowed': 'Firebase\'de E-posta/Şifre girişi açılmamış (README\'ye bak).',
  };
  return new AuthError(map[code] || `Bir hata oluştu (${code || (e && e.message) || 'bilinmiyor'}).`);
}

const CloudBackend = {
  mode: 'cloud',
  user: null,
  fb: null,
  synced: null,
  pending: null,
  timer: null,
  legacy: null,
  onSyncError: null,

  email: (name) => `${name}@users.akis.app`,

  async init(cfg) {
    const [appM, authM, fsM] = await Promise.all([
      import(FIREBASE_SDK + 'firebase-app.js'),
      import(FIREBASE_SDK + 'firebase-auth.js'),
      import(FIREBASE_SDK + 'firebase-firestore.js'),
    ]);
    const app = appM.initializeApp(cfg, 'akis');
    this.fb = { auth: authM.getAuth(app), db: fsM.getFirestore(app), A: authM, F: fsM };
    const u = await new Promise((resolve) => {
      const off = authM.onAuthStateChanged(this.fb.auth, (x) => {
        off();
        resolve(x);
      });
    });
    this.user = u ? { id: u.uid, name: String(u.email || '').split('@')[0] } : null;
    return this.user;
  },

  async register(username, password) {
    const name = normUser(username);
    checkCredentials(name, password);
    let cred;
    try {
      cred = await this.fb.A.createUserWithEmailAndPassword(this.fb.auth, this.email(name), password);
    } catch (e) {
      throw firebaseMessage(e);
    }
    this.legacy = takeLegacy();
    this.synced = null;
    this.user = { id: cred.user.uid, name };
    return this.user;
  },

  async login(username, password) {
    const name = normUser(username);
    if (!USERNAME_RE.test(name)) throw new AuthError('Kullanıcı adı veya şifre hatalı.');
    let cred;
    try {
      cred = await this.fb.A.signInWithEmailAndPassword(this.fb.auth, this.email(name), String(password || ''));
    } catch (e) {
      throw firebaseMessage(e);
    }
    this.synced = null;
    this.user = { id: cred.user.uid, name };
    return this.user;
  },

  async logout() {
    await this.flush();
    await this.fb.A.signOut(this.fb.auth);
    this.user = null;
    this.synced = null;
  },

  async loadState() {
    const { db, F } = this.fb;
    const uid = this.user.id;
    const cacheKey = 'akis.c.' + uid;
    const cached = readJSON(cacheKey);
    let snap;
    try {
      snap = await F.getDoc(F.doc(db, 'akis', uid));
    } catch (e) {
      // Çevrimdışı: bu cihazdaki son kopyayla devam et. Kopya yoksa buluttakinin
      // üzerine boş veri yazmamak için hata ver.
      if (cached) return cached;
      throw e;
    }
    let state = null;
    if (snap.exists()) {
      this.synced = snap.data().json;
      state = JSON.parse(this.synced);
    } else if (this.legacy) {
      state = this.legacy;
      this.legacy = null;
    }
    if (state) writeJSON(cacheKey, state);
    return state;
  },

  save(state) {
    writeJSON('akis.c.' + this.user.id, state);
    this.pending = state;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 800);
    return true;
  },

  async flush() {
    clearTimeout(this.timer);
    const state = this.pending;
    if (!state || !this.user) return;
    this.pending = null;
    const json = JSON.stringify(state);
    if (json === this.synced) return;
    const { db, F } = this.fb;
    try {
      await F.setDoc(F.doc(db, 'akis', this.user.id), { json, updatedAt: Date.now() });
      this.synced = json;
    } catch (e) {
      if (!this.pending) this.pending = state;
      if (this.onSyncError) this.onSyncError(e);
    }
  },
};

const Store = window.AKIS_FIREBASE && window.AKIS_FIREBASE.apiKey ? CloudBackend : LocalBackend;
