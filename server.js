const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database connection
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root', // replace with your MySQL username
    password: '', // replace with your MySQL password
    database: 'healthhub',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// JWT Secret
const JWT_SECRET = 'your_jwt_secret_key'; // In production, use environment variable

// Authentication Middleware
async function authenticate(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        const token = jwt.sign({ userId: result.insertId }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, userId: result.insertId, name });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Email already registered' });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = users[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, userId: user.id, name: user.name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Health Data Endpoints
app.post('/api/health', authenticate, async (req, res) => {
    try {
        const { blood_pressure, heart_rate, blood_sugar, weight } = req.body;
        await pool.execute(
            'INSERT INTO health_data (user_id, blood_pressure, heart_rate, blood_sugar, weight) VALUES (?, ?, ?, ?, ?)',
            [req.userId, blood_pressure, heart_rate, blood_sugar, weight]
        );
        res.json({ message: 'Health data saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/health', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM health_data WHERE user_id = ? ORDER BY date DESC',
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Exercise Data Endpoints
app.post('/api/exercise', authenticate, async (req, res) => {
    try {
        const { exercise_type, exercise_name, duration, calories } = req.body;
        await pool.execute(
            'INSERT INTO exercise_data (user_id, exercise_type, exercise_name, duration, calories) VALUES (?, ?, ?, ?, ?)',
            [req.userId, exercise_type, exercise_name, duration, calories]
        );
        res.json({ message: 'Exercise data saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/exercise', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM exercise_data WHERE user_id = ? ORDER BY date DESC',
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Nutrition Data Endpoints
app.post('/api/nutrition', authenticate, async (req, res) => {
    try {
        const { meal_type, meal_name, calories, carbs, protein, fat } = req.body;
        await pool.execute(
            'INSERT INTO nutrition_data (user_id, meal_type, meal_name, calories, carbs, protein, fat) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.userId, meal_type, meal_name, calories, carbs, protein, fat]
        );
        res.json({ message: 'Nutrition data saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/nutrition', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM nutrition_data WHERE user_id = ? ORDER BY date DESC',
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Reminders Endpoints
app.post('/api/reminders', authenticate, async (req, res) => {
    try {
        const { title, time, date, repeat, category } = req.body;
        await pool.execute(
            'INSERT INTO reminders (user_id, title, time, date, repeat, category) VALUES (?, ?, ?, ?, ?, ?)',
            [req.userId, title, time, date, repeat, category]
        );
        res.json({ message: 'Reminder saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/reminders', authenticate, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM reminders WHERE user_id = ? ORDER BY date, time',
            [req.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Dashboard Stats
app.get('/api/dashboard', authenticate, async (req, res) => {
    try {
        // Active minutes
        const [activeMinutes] = await pool.execute(
            'SELECT SUM(duration) as total FROM exercise_data WHERE user_id = ?',
            [req.userId]
        );
        
        // Calories burned
        const [caloriesBurned] = await pool.execute(
            'SELECT SUM(calories) as total FROM exercise_data WHERE user_id = ?',
            [req.userId]
        );
        
        // Nutrition totals
        const [nutritionTotals] = await pool.execute(
            'SELECT SUM(calories) as calories, SUM(carbs) as carbs, SUM(protein) as protein, SUM(fat) as fat FROM nutrition_data WHERE user_id = ?',
            [req.userId]
        );
        
        res.json({
            activeMinutes: activeMinutes[0].total || 0,
            caloriesBurned: caloriesBurned[0].total || 0,
            nutritionTotals: nutritionTotals[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});