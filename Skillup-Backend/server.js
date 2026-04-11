const fs = require('fs/promises');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const nodemailer = require('nodemailer');

const PORT = Number(process.env.PORT || 5000);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@skillup.com';
const LOCAL_STORE_PATH = path.join(__dirname, 'data', 'local-store.json');

const app = express();
app.use(cors());
app.use(express.json());

let db = null;
let dataMode = 'local';
let localStoreCache = null;

function createInitialLocalStore() {
  return {
    nextIds: {
      ngo_users: 3,
      workshops: 5,
      volunteers: 3,
      donations: 2,
      contacts: 3,
      events: 4,
      testimonials: 4,
    },
    ngo_users: [
      {
        id: 1,
        ngo_name: 'SkillUp Admin',
        email: ADMIN_EMAIL,
        password: 'admin123',
        created_at: '2026-04-01T08:00:00.000Z',
      },
      {
        id: 2,
        ngo_name: 'Bright Future Foundation',
        email: 'partner@brightfuture.org',
        password: 'partner123',
        created_at: '2026-04-02T09:00:00.000Z',
      },
    ],
    workshops: [
      {
        id: 1,
        ngo_id: 2,
        title: 'Digital Literacy Sprint',
        description: 'A practical beginner workshop on email, safety, and using online tools for learning.',
        category: 'Technology',
        event_date: '2026-05-16',
        location: 'Pune Community Studio',
        institute_name: 'Bright Future Foundation',
        status: 'approved',
        contact_no: '+91 9876543210',
        profileUrl: 'https://skillup-demo.org/workshops/digital-literacy',
        created_at: '2026-04-03T10:30:00.000Z',
      },
      {
        id: 2,
        ngo_id: 2,
        title: 'Career Confidence Lab',
        description: 'Mock interviews, resume reviews, and small-group coaching for students and job seekers.',
        category: 'Career Skills',
        event_date: '2026-05-28',
        location: 'Mumbai Youth Centre',
        institute_name: 'Youth Thrive Trust',
        status: 'approved',
        contact_no: '+91 8765432109',
        profileUrl: 'https://skillup-demo.org/careers/confidence',
        created_at: '2026-04-04T09:15:00.000Z',
      },
      {
        id: 3,
        ngo_id: 2,
        title: 'Community Health Session',
        description: 'An accessible awareness drive on hygiene, prevention, and everyday health routines for families.',
        category: 'Health',
        event_date: '2026-06-10',
        location: 'Delhi Civic Hall',
        institute_name: 'HealthBridge NGO',
        status: 'approved',
        contact_no: '+91 7654321098',
        created_at: '2026-04-05T11:45:00.000Z',
      },
      {
        id: 4,
        ngo_id: 2,
        title: 'Creative Futures Design Circle',
        description: 'A pending workshop proposal focused on design thinking, visual storytelling, and portfolio basics.',
        category: 'Design',
        event_date: '2026-06-24',
        location: 'Hybrid · Ahmedabad',
        institute_name: 'Creative Minds Institute',
        status: 'approved',
        contact_no: '+91 6543210987',
        created_at: '2026-04-07T15:20:00.000Z',
      },
      {
        id: 5,
        ngo_id: 2,
        title: 'Solar Energy Basics',
        description: 'Learn how to set up small solar panels and maintain them for home use.',
        category: 'Sustainability',
        event_date: '2026-07-05',
        location: 'Nagpur Rural Hub',
        institute_name: 'EcoPower NGO',
        status: 'approved',
        contact_no: '+91 5432109876',
        created_at: '2026-04-08T10:00:00.000Z',
      },
      {
        id: 6,
        ngo_id: 2,
        title: 'Basic First Aid Training',
        description: 'Essential life-saving skills for everyday emergencies.',
        category: 'Health',
        event_date: '2026-07-15',
        location: 'Chennai Public Library',
        institute_name: 'RedCross Connect',
        status: 'approved',
        contact_no: '+91 4321098765',
        created_at: '2026-04-09T14:30:00.000Z',
      },
    ],
    volunteers: [
      {
        id: 1,
        full_name: 'Aarav Mehta',
        email: 'aarav@example.com',
        phone: '+91 9988776655',
        skills: 'Mentoring, facilitation',
        message: 'Available on weekends for student mentoring and mock interviews.',
        created_at: '2026-04-06T12:10:00.000Z',
      },
      {
        id: 2,
        full_name: 'Sana Khan',
        email: 'sana@example.com',
        phone: '+91 8877665544',
        skills: 'Design, social media',
        message: 'Happy to help with community flyers and event promotion.',
        created_at: '2026-04-07T10:25:00.000Z',
      },
    ],
    donations: [
      {
        id: 1,
        full_name: 'Local Supporter',
        email: 'support@example.com',
        amount: 12000,
        message: 'Initial support for student outreach.',
        created_at: '2026-04-05T14:10:00.000Z',
      },
    ],
    contacts: [
      {
        id: 1,
        full_name: 'Priya Sharma',
        email: 'priya@example.com',
        subject: 'School collaboration',
        message: 'We would love to bring your digital literacy workshop to our campus next month.',
        created_at: '2026-04-05T13:00:00.000Z',
      },
      {
        id: 2,
        full_name: 'Nikhil Rao',
        email: 'nikhil@example.com',
        subject: 'Volunteer onboarding',
        message: 'Could you share the expected time commitment for weekend programs?',
        created_at: '2026-04-07T09:40:00.000Z',
      },
    ],
    events: [
      {
        id: 1,
        title: 'Youth Leadership Camp',
        category: 'Community Event',
        event_date: '2026-05-11',
        location: 'Green Park Auditorium',
        description: 'A confidence-building camp with public speaking, teamwork, and leadership coaching.',
        badge: 'Featured Event',
        contact_no: '+91 9988776655',
        profileUrl: 'https://youth-leaders.org/camp-2026',
        created_at: '2026-04-03T08:30:00.000Z',
      },
      {
        id: 2,
        title: 'Digital Skills Starter Camp',
        category: 'Community Event',
        event_date: '2026-05-20',
        location: 'Riverside Community Hall',
        description: 'An easy on-ramp into online safety, search, and productivity tools for first-time learners.',
        badge: 'Upcoming Event',
        contact_no: '+91 8877665544',
        created_at: '2026-04-04T07:50:00.000Z',
      },
      {
        id: 3,
        title: 'Local Job and Internship Fair',
        category: 'Community Event',
        event_date: '2026-06-05',
        location: 'Downtown Convention Center',
        description: 'A public hiring and mentoring meetup connecting local employers with emerging talent.',
        badge: 'Career Fair',
        contact_no: '+91 7766554433',
        created_at: '2026-04-06T16:00:00.000Z',
      },
      {
        id: 4,
        title: 'Financial Literacy Workshop',
        category: 'Community Event',
        event_date: '2026-06-15',
        location: 'Community Hub East',
        description: 'Understanding savings, banking, and government schemes.',
        badge: 'Money Matters',
        contact_no: '+91 6655443322',
        created_at: '2026-04-07T11:00:00.000Z',
      },
      {
        id: 5,
        title: 'Green Earth Awareness Walk',
        category: 'Community Event',
        event_date: '2026-06-22',
        location: 'Central Park Entrance',
        description: 'A walk to promote environmental awareness and waste management.',
        badge: 'Eco Walk',
        contact_no: '+91 5544332211',
        created_at: '2026-04-08T08:00:00.000Z',
      },
    ],
    testimonials: [
      {
        id: 1,
        name: 'Aarav Mehta',
        role: 'Volunteer Mentor',
        quote: 'The platform now feels professional enough for real community rollouts, not just a class demo.',
      },
      {
        id: 2,
        name: 'Priya Sharma',
        role: 'NGO Program Lead',
        quote: 'Publishing workshops and managing follow-up is dramatically easier with everything in one dashboard.',
      },
      {
        id: 3,
        name: 'Sana Khan',
        role: 'Student Participant',
        quote: 'The new site feels welcoming, polished, and much easier to trust at first glance.',
      },
    ],
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortByEventDateAsc(items) {
  return [...items].sort((left, right) => new Date(left.event_date) - new Date(right.event_date));
}

function sortByCreatedDesc(items) {
  return [...items].sort((left, right) => new Date(right.created_at) - new Date(left.created_at));
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function ensureLocalStore() {
  if (localStoreCache) {
    return localStoreCache;
  }

  await fs.mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });

  try {
    const contents = await fs.readFile(LOCAL_STORE_PATH, 'utf8');
    localStoreCache = { ...createInitialLocalStore(), ...JSON.parse(contents) };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    localStoreCache = createInitialLocalStore();
    await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(localStoreCache, null, 2));
  }

  return localStoreCache;
}

async function persistLocalStore() {
  if (!localStoreCache) {
    return;
  }

  await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(localStoreCache, null, 2));
}

async function readLocalCollection(collection) {
  const store = await ensureLocalStore();
  return clone(store[collection] || []);
}

async function mutateLocalStore(mutator) {
  const store = await ensureLocalStore();
  const result = await mutator(store);
  await persistLocalStore();
  return result;
}

function nextLocalId(store, collection) {
  const highestExistingId = Math.max(
    0,
    ...(Array.isArray(store[collection]) ? store[collection].map((item) => Number(item.id || 0)) : [0])
  );
  const current = Number(store.nextIds?.[collection] || highestExistingId + 1);
  store.nextIds[collection] = current + 1;
  return current;
}

async function runWithStorage(databaseHandler, localHandler) {
  if (dataMode === 'database' && db) {
    try {
      return await databaseHandler();
    } catch (error) {
      console.warn('Database request failed, switching to local mode:', error.message);
      dataMode = 'local';
      await ensureLocalStore();
    }
  }

  return localHandler();
}

function createMailTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendNotificationEmail(payload) {
  const transporter = createMailTransporter();
  if (!transporter) {
    return { delivered: false, skipped: true };
  }

  const subjectMap = {
    contact: `New Contact Form: ${payload.name}`,
    program: `New Program Submission: ${payload.name}`,
    volunteer: `New Volunteer Sign-up: ${payload.name}`,
  };

  try {
    await transporter.sendMail({
      from: `"SkillUp Connect" <${process.env.GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: subjectMap[payload.type] || 'New SkillUp Notification',
      html: `
        <h2>${subjectMap[payload.type] || 'New SkillUp Notification'}</h2>
        <p><strong>Name:</strong> ${payload.name}</p>
        <p><strong>Email:</strong> ${payload.email}</p>
        <p><strong>Details:</strong> ${payload.message}</p>
      `,
    });

    return { delivered: true, skipped: false };
  } catch (error) {
    console.warn('Email delivery skipped:', error.message);
    return { delivered: false, skipped: true };
  }
}

async function initializeDatabase() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'skillup_connect',
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 5000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const connection = pool.promise();
  await connection.query('SELECT 1');
  db = connection;
  await ensureTables();
  await seedDatabaseContent();
  dataMode = 'database';
}

async function ensureTables() {
  await Promise.all([
    db.query(`
      CREATE TABLE IF NOT EXISTS ngo_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ngo_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.query(`
      CREATE TABLE IF NOT EXISTS workshops (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ngo_id INT NOT NULL DEFAULT 1,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        event_date DATE NOT NULL,
        location VARCHAR(255) NOT NULL,
        institute_name VARCHAR(255) NOT NULL,
        status ENUM('pending', 'approved') NOT NULL DEFAULT 'pending',
        contact_no VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.query(`
      CREATE TABLE IF NOT EXISTS volunteers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        skills VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.query(`
      CREATE TABLE IF NOT EXISTS donations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        event_date DATE NOT NULL,
        location VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        badge VARCHAR(100) NOT NULL DEFAULT 'Community Event',
        status ENUM('pending', 'approved') NOT NULL DEFAULT 'pending',
        contact_no VARCHAR(50) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.query(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(255) NOT NULL,
        quote TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `),
  ]);
}

async function seedTableIfEmpty(tableName, rows, query, minCount = 1) {
  const [[countRow]] = await db.query(`SELECT COUNT(*) AS total FROM ${tableName}`);
  if (Number(countRow.total || 0) < minCount && rows.length > 0) {
    // If it's not empty but has few items, we'll try to insert missing ones
    // For simplicity, we'll just insert everything using INSERT IGNORE if possible, 
    // or just let it fail if ID is duplicate.
    await db.query(query.replace('INSERT INTO', 'INSERT IGNORE INTO'), [rows]);
  }
}

async function seedDatabaseContent() {
  const seed = createInitialLocalStore();

  await seedTableIfEmpty(
    'ngo_users',
    seed.ngo_users.map((user) => [user.ngo_name, user.email, user.password]),
    'INSERT INTO ngo_users (ngo_name, email, password) VALUES ?'
  );

  await seedTableIfEmpty(
    'workshops',
    seed.workshops.map((item) => [
      item.ngo_id,
      item.title,
      item.description,
      item.category,
      item.event_date,
      item.location,
      item.institute_name,
      item.status,
      item.contact_no,
    ]),
    'INSERT INTO workshops (ngo_id, title, description, category, event_date, location, institute_name, status, contact_no) VALUES ?',
    8
  );

  await seedTableIfEmpty(
    'events',
    seed.events.map((item) => [
      item.title,
      item.category,
      item.event_date,
      item.location,
      item.description,
      item.badge,
      item.contact_no,
    ]),
    'INSERT INTO events (title, category, event_date, location, description, badge, contact_no) VALUES ?',
    8
  );

  await seedTableIfEmpty(
    'testimonials',
    seed.testimonials.map((item) => [item.name, item.role, item.quote]),
    'INSERT INTO testimonials (name, role, quote) VALUES ?'
  );
}

async function getImpactStatsFromLocalStore() {
  const store = await ensureLocalStore();
  const workshopsPublished = store.workshops.filter((item) => item.status === 'approved').length;
  const volunteersJoined = store.volunteers.length;
  const donationsRaised = store.donations.reduce((total, donation) => total + toNumber(donation.amount), 0);
  const messagesReceived = store.contacts.length;

  return {
    workshopsPublished,
    volunteersJoined,
    donationsRaised,
    messagesReceived,
    estimatedLivesTouched: workshopsPublished * 35 + volunteersJoined * 5,
  };
}

app.get('/api/health', async (req, res) => {
  if (dataMode === 'local') {
    await ensureLocalStore();
  }

  res.json({
    message: 'SkillUp Connect API is running',
    mode: dataMode,
  });
});

app.post('/api/notify', async (req, res) => {
  const result = await sendNotificationEmail(req.body || {});
  res.json({
    success: true,
    delivery: result.delivered ? 'sent' : 'skipped',
  });
});

app.get('/api/workshops', async (req, res) => {
  try {
    const results = await runWithStorage(
      async () => {
        const [rows] = await db.query("SELECT * FROM workshops WHERE status = 'approved' ORDER BY event_date ASC, created_at DESC");
        return rows;
      },
      async () => {
        const rows = await readLocalCollection('workshops');
        return sortByEventDateAsc(rows.filter((item) => item.status === 'approved'));
      }
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load workshops.' });
  }
});

app.get(['/api/admin/pending', '/api/workshops/pending'], async (req, res) => {
  try {
    const results = await runWithStorage(
      async () => {
        const [rows] = await db.query("SELECT * FROM workshops WHERE status = 'pending' ORDER BY created_at DESC");
        return rows;
      },
      async () => {
        const rows = await readLocalCollection('workshops');
        return sortByCreatedDesc(rows.filter((item) => item.status === 'pending'));
      }
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load pending workshops.' });
  }
});

app.get('/api/admin/workshops', async (req, res) => {
  try {
    const results = await runWithStorage(
      async () => {
        const [rows] = await db.query("SELECT * FROM workshops ORDER BY created_at DESC");
        return rows;
      },
      async () => {
        const rows = await readLocalCollection('workshops');
        return sortByCreatedDesc(rows);
      }
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load all workshops.' });
  }
});

app.get('/api/admin/events', async (req, res) => {
  try {
    const results = await runWithStorage(
      async () => {
        const [rows] = await db.query("SELECT * FROM events ORDER BY created_at DESC");
        return rows;
      },
      async () => {
        const rows = await readLocalCollection('events');
        return sortByCreatedDesc(rows);
      }
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load all events.' });
  }
});

app.post('/api/events', async (req, res) => {
  const { title, category, date, location, description, badge, contact_no } = req.body || {};
  if (!title || !category || !date || !location || !description) {
    return res.status(400).json({ error: 'All event fields are required.' });
  }

  try {
    await runWithStorage(
      async () => {
        await db.query(
          'INSERT INTO events (title, category, event_date, location, description, badge, contact_no) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [title, category, date, location, description, badge || 'Community Event', contact_no || '']
        );
      },
      async () =>
        mutateLocalStore((store) => {
          store.events.push({
            id: nextLocalId(store, 'events'),
            title,
            category,
            event_date: date,
            location,
            description,
            badge: badge || 'Community Event',
            contact_no: contact_no || '',
            created_at: new Date().toISOString(),
          });
        })
    );

    res.json({ message: 'Event added successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save event.' });
  }
});

app.put('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const { title, category, date, location, description, badge, contact_no } = req.body || {};
  if (!title || !category || !date || !location || !description) {
    return res.status(400).json({ error: 'All event fields are required.' });
  }

  try {
    await runWithStorage(
      async () => {
        await db.query(
          'UPDATE events SET title = ?, category = ?, event_date = ?, location = ?, description = ?, badge = ?, contact_no = ? WHERE id = ?',
          [title, category, date, location, description, badge || 'Community Event', contact_no || '', id]
        );
      },
      async () =>
        mutateLocalStore((store) => {
          const target = store.events.find((item) => item.id === Number(id));
          if (!target) throw new Error('Event not found.');
          Object.assign(target, { title, category, event_date: date, location, description, badge: badge || 'Community Event', contact_no: contact_no || '' });
        })
    );
    res.json({ message: 'Event updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update event.' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await runWithStorage(
      async () => {
        await db.query('DELETE FROM events WHERE id = ?', [id]);
      },
      async () =>
        mutateLocalStore((store) => {
          store.events = store.events.filter((item) => item.id !== Number(id));
        })
    );
    res.json({ success: true, message: 'Event deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete event.' });
  }
});

app.post('/api/workshops', async (req, res) => {
  const { title, category, date, location, description, institute_name, contact_no } = req.body || {};
  if (!title || !category || !date || !location || !description || !institute_name) {
    return res.status(400).json({ error: 'All workshop fields are required.' });
  }

  try {
    await runWithStorage(
      async () => {
        await db.query(
          'INSERT INTO workshops (ngo_id, title, description, category, event_date, location, institute_name, status, contact_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [1, title, description, category, date, location, institute_name, 'pending', contact_no || '']
        );
      },
      async () =>
        mutateLocalStore((store) => {
          store.workshops.push({
            id: nextLocalId(store, 'workshops'),
            ngo_id: 1,
            title,
            description,
            category,
            event_date: date,
            location,
            institute_name,
            status: 'pending',
            contact_no: contact_no || '',
            created_at: new Date().toISOString(),
          });
        })
    );

    // Send notification in background (non-blocking)
    sendNotificationEmail({
      type: 'program',
      name: title,
      email: institute_name,
      message: `A new workshop proposal "${title}" has been submitted by ${institute_name} for ${date} at ${location}.`
    }).catch(err => console.error('Background notification failed:', err));

    res.json({ success: true, message: 'Workshop added successfully and is waiting for approval.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save workshop.' });
  }
});

app.put('/api/workshops/:id', async (req, res) => {
  const { id } = req.params;
  const { title, category, date, location, description, institute_name, contact_no } = req.body || {};
  if (!title || !category || !date || !location || !description || !institute_name) {
    return res.status(400).json({ error: 'All workshop fields are required.' });
  }

  try {
    await runWithStorage(
      async () => {
        await db.query(
          'UPDATE workshops SET title = ?, category = ?, event_date = ?, location = ?, description = ?, institute_name = ?, contact_no = ? WHERE id = ?',
          [title, category, date, location, description, institute_name, contact_no || '', id]
        );
      },
      async () =>
        mutateLocalStore((store) => {
          const target = store.workshops.find((item) => item.id === Number(id));
          if (!target) {
            throw new Error('Workshop not found.');
          }

          Object.assign(target, {
            title,
            category,
            event_date: date,
            location,
            description,
            institute_name,
            contact_no: contact_no || '',
          });
        })
    );

    res.json({ message: 'Workshop updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update workshop.' });
  }
});

app.delete('/api/workshops/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await runWithStorage(
      async () => {
        await db.query('DELETE FROM workshops WHERE id = ?', [id]);
      },
      async () =>
        mutateLocalStore((store) => {
          store.workshops = store.workshops.filter((item) => item.id !== Number(id));
        })
    );

    res.json({ success: true, message: 'Workshop deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete workshop.' });
  }
});

app.put(['/api/admin/approve/:id', '/api/workshops/:id/approve'], async (req, res) => {
  const { id } = req.params;

  try {
    await runWithStorage(
      async () => {
        await db.query("UPDATE workshops SET status = 'approved' WHERE id = ?", [id]);
      },
      async () =>
        mutateLocalStore((store) => {
          const target = store.workshops.find((item) => item.id === Number(id));
          if (!target) {
            throw new Error('Workshop not found.');
          }
          target.status = 'approved';
        })
    );

    res.json({ message: 'Workshop approved successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to approve workshop.' });
  }
});

app.post('/api/register', async (req, res) => {
  const { ngo_name, email, password } = req.body || {};
  if (!ngo_name || !email || !password) {
    return res.status(400).json({ error: 'All registration fields are required.' });
  }

  try {
    await runWithStorage(
      async () => {
        await db.query('INSERT INTO ngo_users (ngo_name, email, password) VALUES (?, ?, ?)', [ngo_name, email, password]);
      },
      async () =>
        mutateLocalStore((store) => {
          const duplicate = store.ngo_users.find((user) => user.email === email);
          if (duplicate) {
            throw new Error('Email already exists.');
          }

          store.ngo_users.push({
            id: nextLocalId(store, 'ngo_users'),
            ngo_name,
            email,
            password,
            created_at: new Date().toISOString(),
          });
        })
    );

    res.json({ message: 'NGO account created successfully.' });
  } catch (error) {
    const status = error.message === 'Email already exists.' ? 409 : 500;
    res.status(status).json({ error: error.message || 'Database error while creating account.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@skillup.com';
    const adminPassword = 'admin123';

    if (email === adminEmail && password === adminPassword) {
      return res.json({
        message: 'Login successful (Administrator).',
        user: { id: 0, ngo_name: 'SkillUp Admin', email: adminEmail }
      });
    }

    const user = await runWithStorage(
      async () => {
        const [rows] = await db.query('SELECT * FROM ngo_users WHERE email = ? AND password = ? LIMIT 1', [email, password]);
        return rows[0] || null;
      },
      async () => {
        const users = await readLocalCollection('ngo_users');
        return users.find((item) => item.email === email && item.password === password) || null;
      }
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        ngo_name: user.ngo_name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log in.' });
  }
});

app.post('/api/volunteers', async (req, res) => {
  const { full_name, email, phone, skills, message } = req.body || {};
  if (!full_name || !email || !phone || !skills || !message) {
    return res.status(400).json({ error: 'Please complete the volunteer form.' });
  }

  try {
    await runWithStorage(
      async () => {
        await db.query('INSERT INTO volunteers (full_name, email, phone, skills, message) VALUES (?, ?, ?, ?, ?)', [
          full_name,
          email,
          phone,
          skills,
          message,
        ]);
      },
      async () =>
        mutateLocalStore((store) => {
          store.volunteers.push({
            id: nextLocalId(store, 'volunteers'),
            full_name,
            email,
            phone,
            skills,
            message,
            created_at: new Date().toISOString(),
          });
        })
    );

    // Send notification in background (non-blocking)
    sendNotificationEmail({
      type: 'volunteer',
      name: full_name,
      email: email,
      message: `Skills: ${skills}\nMessage: ${message}`
    }).catch(err => console.error('Background notification failed:', err));

    res.json({ message: 'Volunteer request submitted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit volunteer request.' });
  }
});

app.get('/api/volunteers', async (req, res) => {
  try {
    const rows = await runWithStorage(
      async () => {
        const [result] = await db.query('SELECT * FROM volunteers ORDER BY created_at DESC, id DESC');
        return result;
      },
      async () => sortByCreatedDesc(await readLocalCollection('volunteers'))
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load volunteer requests.' });
  }
});

app.delete('/api/volunteers/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await runWithStorage(
      async () => {
        await db.query('DELETE FROM volunteers WHERE id = ?', [id]);
      },
      async () =>
        mutateLocalStore((store) => {
          store.volunteers = store.volunteers.filter((item) => item.id !== Number(id));
        })
    );

    res.json({ message: 'Volunteer request deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete volunteer request.' });
  }
});

app.post('/api/donations', async (req, res) => {
  const { full_name, email, amount, message } = req.body || {};
  const numericAmount = toNumber(amount);

  if (!full_name || !email || numericAmount <= 0) {
    return res.status(400).json({ error: 'Please provide a valid donation amount.' });
  }

  try {
    await runWithStorage(
      async () => {
        await db.query('INSERT INTO donations (full_name, email, amount, message) VALUES (?, ?, ?, ?)', [
          full_name,
          email,
          numericAmount,
          message || '',
        ]);
      },
      async () =>
        mutateLocalStore((store) => {
          store.donations.push({
            id: nextLocalId(store, 'donations'),
            full_name,
            email,
            amount: numericAmount,
            message: message || '',
            created_at: new Date().toISOString(),
          });
        })
    );

    res.json({ message: 'Donation details saved successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save donation.' });
  }
});

app.get('/api/donations', async (req, res) => {
  try {
    const rows = await runWithStorage(
      async () => {
        const [result] = await db.query('SELECT * FROM donations ORDER BY created_at DESC, id DESC');
        return result;
      },
      async () => sortByCreatedDesc(await readLocalCollection('donations'))
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load donations.' });
  }
});

app.get('/api/contacts', async (req, res) => {
  try {
    const rows = await runWithStorage(
      async () => {
        const [result] = await db.query('SELECT * FROM contacts ORDER BY created_at DESC, id DESC');
        return result;
      },
      async () => sortByCreatedDesc(await readLocalCollection('contacts'))
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load contacts.' });
  }
});

app.post('/api/contacts', async (req, res) => {
  const { full_name, email, subject, message } = req.body || {};
  if (!full_name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Please complete the contact form.' });
  }

  try {
    await runWithStorage(
      async () => {
        await db.query('INSERT INTO contacts (full_name, email, subject, message) VALUES (?, ?, ?, ?)', [
          full_name,
          email,
          subject,
          message,
        ]);
      },
      async () =>
        mutateLocalStore((store) => {
          store.contacts.push({
            id: nextLocalId(store, 'contacts'),
            full_name,
            email,
            subject,
            message,
            created_at: new Date().toISOString(),
          });
        })
    );

    // Send notification in background (non-blocking)
    sendNotificationEmail({
      type: 'contact',
      name: full_name,
      email: email,
      message: `Subject: ${subject}\nMessage: ${message}`
    }).catch(err => console.error('Background notification failed:', err));

    res.json({ message: 'Message sent successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await runWithStorage(
      async () => {
        await db.query('DELETE FROM contacts WHERE id = ?', [id]);
      },
      async () =>
        mutateLocalStore((store) => {
          store.contacts = store.contacts.filter((item) => item.id !== Number(id));
        })
    );

    res.json({ message: 'Message deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message.' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const rows = await runWithStorage(
      async () => {
        const [result] = await db.query("SELECT * FROM events WHERE status = 'approved' ORDER BY event_date ASC, created_at DESC");
        return result;
      },
      async () => (await readLocalCollection('events')).filter(e => e.status === 'approved').sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load events.' });
  }
});

app.post('/api/events', async (req, res) => {
  const { title, category, event_date, location, description, badge, contact_no } = req.body || {};
  if (!title || !category || !event_date || !location || !description) {
    return res.status(400).json({ error: 'All event fields are required.' });
  }

  try {
    await runWithStorage(
      async () => {
        await db.query(
          'INSERT INTO events (title, category, event_date, location, description, badge, status, contact_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [title, category, event_date, location, description, badge || 'Community Event', 'pending', contact_no || '']
        );
      },
      async () =>
        mutateLocalStore((store) => {
          store.events.push({
            id: nextLocalId(store, 'events'),
            title,
            category,
            event_date,
            location,
            description,
            badge: badge || 'Community Event',
            contact_no: contact_no || '',
            created_at: new Date().toISOString(),
          });
        })
    );

    res.json({ message: 'Event added successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save event.' });
  }
});

app.put('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const { title, category, event_date, location, description, badge, contact_no } = req.body || {};
  if (!title || !category || !event_date || !location || !description) {
    return res.status(400).json({ error: 'All event fields are required.' });
  }

  try {
    await runWithStorage(
      async () => {
        await db.query(
          'UPDATE events SET title = ?, category = ?, event_date = ?, location = ?, description = ?, badge = ?, contact_no = ? WHERE id = ?',
          [title, category, event_date, location, description, badge || 'Community Event', contact_no || '', id]
        );
      },
      async () =>
        mutateLocalStore((store) => {
          const target = store.events.find((item) => item.id === Number(id));
          if (!target) {
            throw new Error('Event not found.');
          }

          Object.assign(target, {
            title,
            category,
            event_date,
            location,
            description,
            badge: badge || 'Community Event',
            contact_no: contact_no || '',
          });
        })
    );

    res.json({ message: 'Event updated successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update event.' });
  }
});

// Delete routes are handled above via /api/events/:id and /api/workshops/:id


app.put('/api/admin/events/approve/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await runWithStorage(
      async () => {
        await db.query("UPDATE events SET status = 'approved' WHERE id = ?", [id]);
      },
      async () =>
        mutateLocalStore((store) => {
          const target = store.events.find((item) => item.id === Number(id));
          if (!target) {
            throw new Error('Event not found.');
          }
          target.status = 'approved';
        })
    );

    res.json({ message: 'Event approved successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to approve event.' });
  }
});

app.get('/api/admin/events/pending', async (req, res) => {
  try {
    const rows = await runWithStorage(
      async () => {
        const [result] = await db.query("SELECT * FROM events WHERE status = 'pending' ORDER BY created_at DESC");
        return result;
      },
      async () => (await readLocalCollection('events')).filter(e => e.status === 'pending')
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load pending events.' });
  }
});

app.get('/api/admin/pending', async (req, res) => {
  try {
    const rows = await runWithStorage(
      async () => {
        const [result] = await db.query("SELECT * FROM workshops WHERE status = 'pending' ORDER BY created_at DESC");
        return result;
      },
      async () => (await readLocalCollection('workshops')).filter(w => w.status === 'pending')
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load pending workshops.' });
  }
});

app.get('/api/admin/workshops', async (req, res) => {
  try {
    const rows = await runWithStorage(
      async () => {
        const [result] = await db.query('SELECT * FROM workshops ORDER BY created_at DESC');
        return result;
      },
      async () => readLocalCollection('workshops')
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load workshops.' });
  }
});

app.put('/api/admin/approve/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await runWithStorage(
      async () => {
        await db.query("UPDATE workshops SET status = 'approved' WHERE id = ?", [id]);
      },
      async () =>
        mutateLocalStore((store) => {
          const target = store.workshops.find((item) => item.id === Number(id));
          if (!target) {
            throw new Error('Workshops not found.');
          }
          target.status = 'approved';
        })
    );

    res.json({ message: 'Program approved successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to approve program.' });
  }
});

app.get('/api/testimonials', async (req, res) => {
  try {
    const rows = await runWithStorage(
      async () => {
        const [result] = await db.query('SELECT * FROM testimonials ORDER BY id ASC');
        return result;
      },
      async () => readLocalCollection('testimonials')
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load testimonials.' });
  }
});

app.get('/api/impact-stats', async (req, res) => {
  try {
    const stats = await runWithStorage(
      async () => {
        const [[workshopRow]] = await db.query("SELECT COUNT(*) AS total FROM workshops WHERE status = 'approved'");
        const [[volunteerRow]] = await db.query('SELECT COUNT(*) AS total FROM volunteers');
        const [[donationRow]] = await db.query('SELECT COALESCE(SUM(amount), 0) AS total FROM donations');
        const [[contactRow]] = await db.query('SELECT COUNT(*) AS total FROM contacts');

        const workshopsPublished = toNumber(workshopRow.total);
        const volunteersJoined = toNumber(volunteerRow.total);
        const donationsRaised = toNumber(donationRow.total);
        const messagesReceived = toNumber(contactRow.total);

        return {
          workshopsPublished,
          volunteersJoined,
          donationsRaised,
          messagesReceived,
          estimatedLivesTouched: workshopsPublished * 35 + volunteersJoined * 5,
        };
      },
      async () => getImpactStatsFromLocalStore()
    );

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load impact stats.' });
  }
});

async function bootstrap() {
  try {
    await initializeDatabase();
    console.log('Database mode enabled.');
  } catch (error) {
    dataMode = 'local';
    await ensureLocalStore();
    console.warn('Database unavailable, using local store instead:', error.message);
  }

  app.listen(PORT, () => {
    console.log(`Backend server is running on port ${PORT} (${dataMode} mode)`);
  });
}

bootstrap();
