const { randomUUID, scryptSync, timingSafeEqual } = require('crypto');
const { withDb, nowIso, loadDb } = require('./store');

const googleStateStore = new Map();

function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getGoogleRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/auth/google/callback';
}

function getFrontendRedirectBase() {
  return process.env.FRONTEND_APP_URL || 'http://localhost:3000';
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function safeUser(user) {
  return {
    id: user.id,
    email: user.email || '',
    name: user.name || '',
    username: user.username || '',
    authProviders: Array.isArray(user.authProviders) ? user.authProviders : [],
  };
}

function ensureUserShape(user) {
  if (!Array.isArray(user.authProviders)) {
    user.authProviders = [];
  }
  if (!user.credentials || typeof user.credentials !== 'object') {
    user.credentials = {};
  }
}

function addUserProvider(user, provider) {
  ensureUserShape(user);
  if (!user.authProviders.includes(provider)) {
    user.authProviders.push(provider);
  }
}

function createSession(db, user) {
  const token = randomUUID();
  const session = {
    id: randomUUID(),
    userId: user.id,
    token,
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  };
  db.sessions.push(session);

  db.auditEvents.push({
    id: randomUUID(),
    userId: user.id,
    type: 'auth.signin',
    entityType: 'session',
    entityId: session.id,
    data: { provider: user.authProviders?.[0] || 'unknown' },
    createdAt: nowIso(),
  });

  return { token, user: safeUser(user) };
}

function hashPassword(password, salt = randomUUID()) {
  const digest = scryptSync(password, salt, 64).toString('hex');
  return { salt, digest };
}

function verifyPassword(password, salt, digest) {
  const computed = scryptSync(password, salt, 64);
  const stored = Buffer.from(digest, 'hex');
  if (computed.length !== stored.length) {
    return false;
  }
  return timingSafeEqual(computed, stored);
}

function signIn({ email, name }) {
  const normalizedEmail = normalizeEmail(email || 'demo@vertex.app');
  const displayName = String(name || 'Demo User').trim() || 'Demo User';

  return withDb((db) => {
    let user = db.users.find((u) => normalizeEmail(u.email) === normalizedEmail);
    if (!user) {
      user = {
        id: randomUUID(),
        email: normalizedEmail,
        name: displayName,
        username: normalizedEmail.split('@')[0],
        authProviders: ['demo'],
        credentials: {},
        createdAt: nowIso(),
      };
      db.users.push(user);
    }

    ensureUserShape(user);
    addUserProvider(user, 'demo');

    return createSession(db, user);
  });
}

function registerLocal({ username, password, name, email }) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);

  if (normalizedUsername.length < 3) {
    const error = new Error('Username must be at least 3 characters');
    error.statusCode = 400;
    throw error;
  }
  if (String(password || '').length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.statusCode = 400;
    throw error;
  }

  return withDb((db) => {
    const usernameTaken = db.users.some((u) => normalizeUsername(u.username) === normalizedUsername);
    if (usernameTaken) {
      const error = new Error('Username already exists');
      error.statusCode = 409;
      throw error;
    }

    if (normalizedEmail) {
      const emailTaken = db.users.some((u) => normalizeEmail(u.email) === normalizedEmail);
      if (emailTaken) {
        const error = new Error('Email already exists');
        error.statusCode = 409;
        throw error;
      }
    }

    const passwordHash = hashPassword(String(password));

    const user = {
      id: randomUUID(),
      email: normalizedEmail,
      name: String(name || normalizedUsername).trim() || normalizedUsername,
      username: normalizedUsername,
      authProviders: ['local'],
      credentials: {
        local: {
          passwordSalt: passwordHash.salt,
          passwordDigest: passwordHash.digest,
        },
      },
      createdAt: nowIso(),
    };

    db.users.push(user);

    db.auditEvents.push({
      id: randomUUID(),
      userId: user.id,
      type: 'auth.register',
      entityType: 'user',
      entityId: user.id,
      data: { username: normalizedUsername },
      createdAt: nowIso(),
    });

    return createSession(db, user);
  });
}

function loginLocal({ username, password }) {
  const normalizedUsername = normalizeUsername(username);

  return withDb((db) => {
    const user = db.users.find((u) => normalizeUsername(u.username) === normalizedUsername);
    if (!user) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    ensureUserShape(user);

    const localCreds = user.credentials?.local;
    if (!localCreds?.passwordSalt || !localCreds?.passwordDigest) {
      const error = new Error('Account does not support password login');
      error.statusCode = 400;
      throw error;
    }

    const ok = verifyPassword(String(password || ''), localCreds.passwordSalt, localCreds.passwordDigest);
    if (!ok) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      throw error;
    }

    addUserProvider(user, 'local');
    return createSession(db, user);
  });
}

function getAuthProviders() {
  return {
    google: googleEnabled(),
    local: true,
  };
}

function createGoogleAuthUrl() {
  if (!googleEnabled()) {
    const error = new Error('Google auth is not configured');
    error.statusCode = 400;
    throw error;
  }

  const state = randomUUID();
  googleStateStore.set(state, Date.now() + 1000 * 60 * 10);

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    state,
  };
}

function cleanGoogleStateStore() {
  const now = Date.now();
  for (const [state, expiresAt] of googleStateStore.entries()) {
    if (expiresAt <= now) {
      googleStateStore.delete(state);
    }
  }
}

async function handleGoogleCallback({ code, state }) {
  if (!googleEnabled()) {
    const error = new Error('Google auth is not configured');
    error.statusCode = 400;
    throw error;
  }
  if (!code || !state) {
    const error = new Error('Missing Google callback parameters');
    error.statusCode = 400;
    throw error;
  }

  cleanGoogleStateStore();

  const expiresAt = googleStateStore.get(state);
  if (!expiresAt || expiresAt < Date.now()) {
    const error = new Error('Invalid or expired OAuth state');
    error.statusCode = 400;
    throw error;
  }
  googleStateStore.delete(state);

  const tokenParams = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: getGoogleRedirectUri(),
    grant_type: 'authorization_code',
  });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    const error = new Error('Google token exchange failed');
    error.statusCode = 502;
    throw error;
  }

  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
  });
  const userInfo = await userInfoResponse.json();

  if (!userInfoResponse.ok || !userInfo.email) {
    const error = new Error('Google userinfo fetch failed');
    error.statusCode = 502;
    throw error;
  }

  const normalizedEmail = normalizeEmail(userInfo.email);

  return withDb((db) => {
    let user = db.users.find((u) => normalizeEmail(u.email) === normalizedEmail);
    if (!user) {
      user = {
        id: randomUUID(),
        email: normalizedEmail,
        name: userInfo.name || normalizedEmail,
        username: normalizedEmail.split('@')[0],
        authProviders: ['google'],
        credentials: {
          google: {
            googleId: userInfo.id,
          },
        },
        createdAt: nowIso(),
      };
      db.users.push(user);
    }

    ensureUserShape(user);
    addUserProvider(user, 'google');
    if (!user.credentials.google) {
      user.credentials.google = {};
    }
    user.credentials.google.googleId = userInfo.id;

    return createSession(db, user);
  });
}

function buildGoogleCallbackRedirect({ token, user, error }) {
  const base = getFrontendRedirectBase();
  const target = new URL('/auth/callback', base);
  if (token && user) {
    target.searchParams.set('token', token);
    target.searchParams.set('name', user.name || '');
  }
  if (error) {
    target.searchParams.set('error', error);
  }
  return target.toString();
}

function getSession(token) {
  if (!token) {
    return null;
  }

  const db = loadDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    return null;
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    return null;
  }

  return { session, user: safeUser(user) };
}

function signOut(token) {
  if (!token) {
    return;
  }

  withDb((db) => {
    const index = db.sessions.findIndex((s) => s.token === token);
    if (index < 0) {
      return;
    }

    const session = db.sessions[index];
    db.sessions.splice(index, 1);

    db.auditEvents.push({
      id: randomUUID(),
      userId: session.userId,
      type: 'auth.signout',
      entityType: 'session',
      entityId: session.id,
      data: {},
      createdAt: nowIso(),
    });
  });
}

module.exports = {
  signIn,
  registerLocal,
  loginLocal,
  getAuthProviders,
  createGoogleAuthUrl,
  handleGoogleCallback,
  buildGoogleCallbackRedirect,
  getSession,
  signOut,
};
