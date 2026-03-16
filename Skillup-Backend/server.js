const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Set up the database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // This is usually 'root' by default
  password: 'admin123', // Enter your MySQL password here
  database: 'skillup_connect'
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the SkillUp database successfully!');
});

// Door 1: The Public Feed (Only shows 'approved' programs)
app.get('/api/workshops', (req, res) => {
  const sqlQuery = "SELECT * FROM Workshops WHERE status = 'approved'";
  db.query(sqlQuery, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Door 2: The Admin Inbox (Only shows 'pending' programs)
app.get('/api/workshops/pending', (req, res) => {
  const sqlQuery = "SELECT * FROM Workshops WHERE status = 'pending'";
  db.query(sqlQuery, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


// Our new API endpoint: Delete a specific workshop by its ID
app.delete('/api/workshops/:id', (req, res) => {
  const workshopId = req.params.id; // Grab the ID from the URL
  const sqlQuery = 'DELETE FROM Workshops WHERE id = ?';

  db.query(sqlQuery, [workshopId], (err, results) => {
    if (err) {
      console.error('Error deleting workshop:', err);
      return res.status(500).json({ error: 'Failed to delete workshop' });
    }
    res.json({ message: 'Workshop deleted successfully!' });
  });
});

// 1. UPDATE YOUR POST ROUTE
app.post('/api/workshops', (req, res) => {
  // Grab the new payload variables sent from React
  const { title, category, date, location, description, institute_name } = req.body; 

  const sqlQuery = 'INSERT INTO Workshops (ngo_id, title, description, category, event_date, location, institute_name) VALUES (1, ?, ?, ?, ?, ?, ?)';

  db.query(sqlQuery, [title, description, category, date, location, institute_name], (err, results) => {
    if (err) {
      console.error('Error saving to database:', err);
      return res.status(500).json({ error: 'Failed to save workshop' });
    }
    res.json({ message: 'Workshop added to MySQL successfully!' });
  });
});

// 2. UPDATE YOUR PUT ROUTE
app.put('/api/workshops/:id', (req, res) => {
  const workshopId = req.params.id; 
  const { title, category, date, location, description, institute_name } = req.body; 

  const sqlQuery = 'UPDATE Workshops SET title = ?, category = ?, event_date = ?, location = ?, description = ?, institute_name = ? WHERE id = ?';

  db.query(sqlQuery, [title, category, date, location, description, institute_name, workshopId], (err, results) => {
    if (err) {
      console.error('Error updating workshop:', err);
      return res.status(500).json({ error: 'Failed to update workshop' });
    }
    res.json({ message: 'Workshop updated successfully!' });
  });
});

// Door 3: The Approve Action
app.put('/api/workshops/:id/approve', (req, res) => {
  const workshopId = req.params.id;
  const sqlQuery = "UPDATE Workshops SET status = 'approved' WHERE id = ?";
  
  db.query(sqlQuery, [workshopId], (err, results) => {
    if (err) {
      console.error('Error approving workshop:', err);
      return res.status(500).json({ error: 'Failed to approve' });
    }
    res.json({ message: 'Workshop officially approved and live!' });
  });
});


// 1. NGO Registration Route
app.post('/api/register', (req, res) => {
  const { ngo_name, email, password } = req.body;
  const sql = "INSERT INTO ngo_users (ngo_name, email, password) VALUES (?, ?, ?)";
  
  db.query(sql, [ngo_name, email, password], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Email already exists or Database error" });
    }
    res.json({ message: "NGO Account created successfully!" });
  });
});

// 2. NGO Login Route
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM ngo_users WHERE email = ? AND password = ?";
  
  db.query(sql, [email, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (results.length > 0) {
      // Success! We found a user with that email and password
      res.json({ message: "Login successful", user: results[0] });
    } else {
      // Failure!
      res.status(401).json({ error: "Invalid email or password" });
    }
  });
});

// Start the server
app.listen(5000, () => {
  console.log('Backend server is running on port 5000');
});

