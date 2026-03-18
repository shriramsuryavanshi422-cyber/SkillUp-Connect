const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'admin123',
  database: 'skillup_connect',
  waitForConnections: true,
  connectionLimit: 10,
});

const db = pool.promise();

const sampleWorkshops = [
  {
    title: 'Digital Literacy for Beginners',
    category: 'Technology',
    event_date: '2026-04-05',
    location: 'Community Hall, Pune',
    description: 'Hands-on training for first-time computer users and students who want to build basic digital confidence.',
    institute_name: 'Bright Future Foundation',
    status: 'approved',
  },
  {
    title: 'Career Readiness Bootcamp',
    category: 'Career Skills',
    event_date: '2026-04-12',
    location: 'SkillUp Learning Center, Mumbai',
    description: 'Resume reviews, interview practice, and mentor sessions for young job seekers.',
    institute_name: 'Youth Thrive Trust',
    status: 'approved',
  },
  {
    title: 'Community Health Awareness Drive',
    category: 'Health',
    event_date: '2026-04-20',
    location: 'Riverside Community Space, Delhi',
    description: 'A public workshop focused on hygiene, prevention, and simple wellness habits for families.',
    institute_name: 'HealthBridge NGO',
    status: 'approved',
  },
];

const sampleEvents = [
  {
    title: 'Youth Leadership Camp',
    category: 'Leadership',
    event_date: '2026-04-18',
    location: 'Green Park Auditorium',
    description: 'A weekend program designed to help students build confidence, public speaking skills, and team leadership.',
    badge: 'Featured Event',
  },
  {
    title: 'Women Entrepreneurship Circle',
    category: 'Livelihood',
    event_date: '2026-04-24',
    location: 'City Innovation Hub',
    description: 'Community discussions, startup guidance, and mentorship for women-led micro businesses.',
    badge: 'Community Event',
  },
  {
    title: 'Free Career Counseling Day',
    category: 'Education',
    event_date: '2026-05-02',
    location: 'NGO Resource Center',
    description: 'One-on-one support for students planning higher education, courses, and first jobs.',
    badge: 'Open House',
  },
];

const sampleTestimonials = [
  {
    name: 'Aarav Mehta',
    role: 'Volunteer Mentor',
    quote: 'The platform made it easy to support students and see real impact in one place.',
  },
  {
    name: 'Priya Sharma',
    role: 'NGO Program Lead',
    quote: 'We can now publish workshops, collect support, and stay connected with the community.',
  },
  {
    name: 'Sana Khan',
    role: 'Student Participant',
    quote: 'The workshops felt practical, supportive, and very close to real NGO experiences.',
  },
];

async function ensureTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ngo_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      ngo_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS volunteers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      skills VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS donations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      event_date DATE NOT NULL,
      location VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      badge VARCHAR(100) NOT NULL DEFAULT 'Community Event',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(255) NOT NULL,
      quote TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function seedTableIfEmpty(tableName, seedRows, insertSql) {
  const [rows] = await db.query(`SELECT COUNT(*) AS total FROM ${tableName}`);
  const total = Number(rows[0]?.total || 0);

  if (total === 0 && seedRows.length > 0) {
    await db.query(insertSql, [seedRows]);
  }
}

async function seedContent() {
  await seedTableIfEmpty(
    'workshops',
    sampleWorkshops.map((workshop) => [
      1,
      workshop.title,
      workshop.description,
      workshop.category,
      workshop.event_date,
      workshop.location,
      workshop.institute_name,
      workshop.status,
    ]),
    'INSERT INTO workshops (ngo_id, title, description, category, event_date, location, institute_name, status) VALUES ?'
  );

  await seedTableIfEmpty(
    'events',
    sampleEvents.map((event) => [
      event.title,
      event.category,
      event.event_date,
      event.location,
      event.description,
      event.badge,
    ]),
    'INSERT INTO events (title, category, event_date, location, description, badge) VALUES ?'
  );

  await seedTableIfEmpty(
    'testimonials',
    sampleTestimonials.map((testimonial) => [
      testimonial.name,
      testimonial.role,
      testimonial.quote,
    ]),
    'INSERT INTO testimonials (name, role, quote) VALUES ?'
  );
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

app.get('/api/health', (req, res) => {
  res.json({ message: 'SkillUp Connect API is running' });
});

app.get('/api/workshops', async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT * FROM workshops WHERE status = 'approved' ORDER BY event_date ASC, created_at DESC"
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get(['/api/admin/pending', '/api/workshops/pending'], async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT * FROM workshops WHERE status = 'pending' ORDER BY created_at DESC"
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workshops', async (req, res) => {
  try {
    const { title, category, date, location, description, institute_name } = req.body;

    if (!title || !category || !date || !location || !description || !institute_name) {
      return res.status(400).json({ error: 'All workshop fields are required.' });
    }

    await db.query(
      'INSERT INTO workshops (ngo_id, title, description, category, event_date, location, institute_name, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [1, title, description, category, date, location, institute_name, 'pending']
    );

    res.json({ message: 'Workshop added successfully and is waiting for approval.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save workshop' });
  }
});

app.put('/api/workshops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, date, location, description, institute_name } = req.body;

    if (!title || !category || !date || !location || !description || !institute_name) {
      return res.status(400).json({ error: 'All workshop fields are required.' });
    }

    await db.query(
      'UPDATE workshops SET title = ?, category = ?, event_date = ?, location = ?, description = ?, institute_name = ? WHERE id = ?',
      [title, category, date, location, description, institute_name, id]
    );

    res.json({ message: 'Workshop updated successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update workshop' });
  }
});

app.delete('/api/workshops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM workshops WHERE id = ?', [id]);
    res.json({ message: 'Workshop deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workshop' });
  }
});

app.put(['/api/admin/approve/:id', '/api/workshops/:id/approve'], async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE workshops SET status = 'approved' WHERE id = ?", [id]);
    res.json({ message: 'Workshop approved successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve workshop' });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { ngo_name, email, password } = req.body;

    if (!ngo_name || !email || !password) {
      return res.status(400).json({ error: 'All registration fields are required.' });
    }

    await db.query(
      'INSERT INTO ngo_users (ngo_name, email, password) VALUES (?, ?, ?)',
      [ngo_name, email, password]
    );

    res.json({ message: 'NGO account created successfully!' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    res.status(500).json({ error: 'Database error while creating account.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [results] = await db.query(
      'SELECT * FROM ngo_users WHERE email = ? AND password = ?',
      [email, password]
    );

    if (results.length > 0) {
      res.json({ message: 'Login successful', user: results[0] });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/volunteers', async (req, res) => {
  try {
    const { full_name, email, phone, skills, message } = req.body;

    if (!full_name || !email || !phone || !skills || !message) {
      return res.status(400).json({ error: 'Please complete the volunteer form.' });
    }

    await db.query(
      'INSERT INTO volunteers (full_name, email, phone, skills, message) VALUES (?, ?, ?, ?, ?)',
      [full_name, email, phone, skills, message]
    );

    res.json({ message: 'Volunteer request submitted successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit volunteer request.' });
  }
});

app.post('/api/donations', async (req, res) => {
  try {
    const { full_name, email, amount, message } = req.body;
    const numericAmount = toNumber(amount);

    if (!full_name || !email || numericAmount <= 0) {
      return res.status(400).json({ error: 'Please provide a valid donation amount.' });
    }

    await db.query(
      'INSERT INTO donations (full_name, email, amount, message) VALUES (?, ?, ?, ?)',
      [full_name, email, numericAmount, message || '']
    );

    res.json({ message: 'Donation details saved successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save donation.' });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { full_name, email, subject, message } = req.body;

    if (!full_name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Please complete the contact form.' });
    }

    await db.query(
      'INSERT INTO contacts (full_name, email, subject, message) VALUES (?, ?, ?, ?)',
      [full_name, email, subject, message]
    );

    res.json({ message: 'Message sent successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT * FROM events ORDER BY event_date ASC, created_at DESC'
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/testimonials', async (req, res) => {
  try {
    const [results] = await db.query(
      'SELECT * FROM testimonials ORDER BY id ASC'
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/impact-stats', async (req, res) => {
  try {
    const [[workshopRows]] = await db.query(
      "SELECT COUNT(*) AS total FROM workshops WHERE status = 'approved'"
    );
    const [[volunteerRows]] = await db.query('SELECT COUNT(*) AS total FROM volunteers');
    const [[donationRows]] = await db.query('SELECT COALESCE(SUM(amount), 0) AS total FROM donations');
    const [[contactRows]] = await db.query('SELECT COUNT(*) AS total FROM contacts');

    const workshopsPublished = toNumber(workshopRows.total);
    const volunteersJoined = toNumber(volunteerRows.total);
    const donationsRaised = toNumber(donationRows.total);
    const messagesReceived = toNumber(contactRows.total);

    res.json({
      workshopsPublished,
      volunteersJoined,
      donationsRaised,
      messagesReceived,
      estimatedLivesTouched: workshopsPublished * 35 + volunteersJoined * 5,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  try {
    await ensureTables();
    await seedContent();
    app.listen(5000, () => {
      console.log('Backend server is running on port 5000');
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
    process.exit(1);
  }
}

startServer();
