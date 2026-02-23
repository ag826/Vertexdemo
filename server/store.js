const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

function nowIso() {
  return new Date().toISOString();
}

function makeTranscript({ platform, occasion, date, time, location, fullTranscript, highlightedText }) {
  return {
    id: randomUUID(),
    platform,
    occasion,
    date,
    time,
    location,
    fullTranscript,
    highlightedText,
    createdAt: nowIso(),
  };
}

function makeInsight({ text, source, category, transcriptId }) {
  return {
    id: randomUUID(),
    text,
    source,
    category,
    transcriptId,
    createdAt: nowIso(),
  };
}

function makeAction({ type, title, description, priority, dueDate, transcriptId }) {
  return {
    id: randomUUID(),
    type,
    title,
    description,
    priority,
    dueDate,
    transcriptId,
    createdAt: nowIso(),
  };
}

function createInitialDb() {
  const userId = randomUUID();

  const transcript1 = makeTranscript({
    platform: 'In-Person',
    occasion: 'Tech Summit 2026 - Product Leadership Panel',
    date: 'February 3, 2026',
    time: '2:30 PM',
    location: 'Moscone Center, San Francisco',
    fullTranscript:
      "We are launching a complete redesign in May after six months of work. We are hiring product managers and focusing heavily on AI-first capabilities.",
    highlightedText: 'launching a complete redesign in May',
  });

  const transcript2 = makeTranscript({
    platform: 'Video Call',
    occasion: 'Climate Tech Conference - Investor Panel',
    date: 'February 3, 2026',
    time: '11:00 AM',
    location: 'Virtual Event',
    fullTranscript:
      'We just closed a $50M climate fund and are actively looking for early-stage carbon capture and renewable energy startups.',
    highlightedText: 'closed a $50M climate fund',
  });

  const contact1 = {
    id: randomUUID(),
    userId,
    name: 'Sarah Chen',
    title: 'VP of Product',
    company: 'TechFlow Inc',
    location: 'San Francisco, CA',
    linkedInUrl: 'linkedin.com/in/sarahchen',
    profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    dateAdded: '2026-02-03',
    notes:
      "Met at Tech Summit 2026. Interested in AI automation tools and hiring product managers in Q2.",
    keyFacts: [
      makeInsight({
        text: 'Leading complete product redesign launching in May',
        source: 'Conversation',
        category: 'Professional',
        transcriptId: transcript1.id,
      }),
      makeInsight({
        text: 'Previously led product at Google for 6 years',
        source: 'LinkedIn',
        category: 'Background',
      }),
    ],
    funFacts: [
      makeInsight({
        text: 'Third-wave coffee enthusiast who roasts beans',
        source: 'Conversation',
        category: 'Interest',
      }),
    ],
    suggestedActions: [
      makeAction({
        type: 'meeting',
        title: 'Schedule coffee to discuss AI tooling',
        description: 'She asked for practical recommendations for product-team automation',
        priority: 'high',
        dueDate: 'February 28, 2026',
        transcriptId: transcript1.id,
      }),
    ],
    conversationDuration: '8 min',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const contact2 = {
    id: randomUUID(),
    userId,
    name: 'Marcus Johnson',
    title: 'Founder & CEO',
    company: 'GreenStart Ventures',
    location: 'Austin, TX',
    linkedInUrl: 'linkedin.com/in/marcusjohnson',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    dateAdded: '2026-02-03',
    notes: 'Looking for climate startups in carbon capture and renewable energy.',
    keyFacts: [
      makeInsight({
        text: 'Just closed $50M climate tech fund',
        source: 'Conversation',
        category: 'Professional',
        transcriptId: transcript2.id,
      }),
    ],
    funFacts: [
      makeInsight({
        text: 'Completed marathons on 5 continents',
        source: 'Conversation',
        category: 'Interest',
      }),
    ],
    suggestedActions: [
      makeAction({
        type: 'email',
        title: 'Send climate startup deck',
        description: 'He requested seed-to-Series A opportunities',
        priority: 'high',
        dueDate: 'March 1, 2026',
        transcriptId: transcript2.id,
      }),
    ],
    conversationDuration: '12 min',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  return {
    users: [
      {
        id: userId,
        email: 'demo@vertex.app',
        name: 'Demo User',
        createdAt: nowIso(),
      },
    ],
    sessions: [],
    contacts: [contact1, contact2],
    recordings: [],
    transcripts: [transcript1, transcript2],
    integrations: [],
    messages: [],
    pendingMatches: [],
    auditEvents: [],
  };
}

function ensureDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(createInitialDb(), null, 2), 'utf-8');
  }
}

function migrateDb(db) {
  let changed = false;

  if (!Array.isArray(db.integrations)) {
    db.integrations = [];
    changed = true;
  }

  if (!Array.isArray(db.auditEvents)) {
    db.auditEvents = [];
    changed = true;
  }

  if (!Array.isArray(db.messages)) {
    db.messages = [];
    changed = true;
  }

  if (!Array.isArray(db.pendingMatches)) {
    db.pendingMatches = [];
    changed = true;
  }

  if (!Array.isArray(db.contacts)) {
    db.contacts = [];
    changed = true;
  }

  if (!Array.isArray(db.users)) {
    db.users = [];
    changed = true;
  }

  db.users.forEach((user) => {
    if (!Array.isArray(user.authProviders)) {
      user.authProviders = ['demo'];
      changed = true;
    }
    if (!user.credentials || typeof user.credentials !== 'object') {
      user.credentials = {};
      changed = true;
    }
    if (!user.username) {
      const emailPrefix = String(user.email || '').split('@')[0] || `user-${String(user.id || '').slice(0, 6)}`;
      user.username = String(emailPrefix).toLowerCase();
      changed = true;
    }
  });

  db.contacts.forEach((contact) => {
    if (!Array.isArray(contact.externalProfiles)) {
      contact.externalProfiles = [];
      changed = true;
    }
    if (!Array.isArray(contact.emails)) {
      contact.emails = [];
      changed = true;
    }
    if (!Array.isArray(contact.keyFacts)) {
      contact.keyFacts = [];
      changed = true;
    }
    if (!Array.isArray(contact.funFacts)) {
      contact.funFacts = [];
      changed = true;
    }
    if (!Array.isArray(contact.suggestedActions)) {
      contact.suggestedActions = [];
      changed = true;
    }
  });

  db.messages.forEach((message) => {
    if (!message.createdAt) {
      message.createdAt = nowIso();
      changed = true;
    }
  });

  return changed;
}

function loadDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const db = JSON.parse(raw);
  const changed = migrateDb(db);
  if (changed) {
    saveDb(db);
  }
  return db;
}

function saveDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function withDb(mutator) {
  const db = loadDb();
  const result = mutator(db);
  saveDb(db);
  return result;
}

module.exports = {
  loadDb,
  saveDb,
  withDb,
  nowIso,
};
