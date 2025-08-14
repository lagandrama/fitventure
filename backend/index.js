// backend/index.js
require('dotenv').config();                // 1) PRVO učitaj .env

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// 2) Tek sad require ruta (sad env postoji u process.env)
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const challengeRoutes = require('./routes/challenges');
const stravaRoutes = require('./routes/strava');
const stravaIntegrationRoutes = require('./routes/integrations/strava');

const app = express();

// 3) DB konekcija
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB povezan'))
  .catch(err => console.error('Greška pri povezivanju s MongoDB:', err));

// 4) Middleware
app.use(cors());
app.use(express.json());

// 5) Health-check
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend radi!' });
});
app.get('/', (req, res) => {
  res.send('FitVenture API is running!');
});

// 6) Rute (1x, bez duplikata)
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', challengeRoutes);
app.use('/api', stravaRoutes);
app.use('/api', stravaIntegrationRoutes);
app.use('/api', require('./routes/leaderboard'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
