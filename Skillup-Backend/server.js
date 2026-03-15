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

// Our very first API endpoint: Fetch all workshops!
app.get('/api/workshops', (req, res) => {
  const sqlQuery = 'SELECT * FROM Workshops';
  
  db.query(sqlQuery, (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Failed to fetch workshops' });
    }
    // Send the database results back to the frontend as JSON!
    res.json(results); 
  });
});

// Our new API endpoint: Receive new workshop data and save it!
app.post('/api/workshops', (req, res) => {
  // 1. Grab the payload sent from React
  const { title, category, date, location } = req.body; 

  // 2. Write the SQL query (we use '?' for security to prevent hacking)
  // Note: We use 1 for the ngo_id for now!
  const sqlQuery = 'INSERT INTO Workshops (ngo_id, title, description, category, event_date, location) VALUES (1, ?, "New Description", ?, ?, ?)';

  // 3. Send it to MySQL
  db.query(sqlQuery, [title, category, date, location], (err, results) => {
    if (err) {
      console.error('Error saving to database:', err);
      return res.status(500).json({ error: 'Failed to save workshop' });
    }
    res.json({ message: 'Workshop added to MySQL successfully!' });
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

// Start the server
app.listen(5000, () => {
  console.log('Backend server is running on port 5000');
});

