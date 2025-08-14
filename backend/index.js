const authRoutes = require('./routes/auth');
const stravaRoutes = require('./routes/strava');
const userRoutes = require('./routes/user');
const challengeRoutes = require('./routes/challenges');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB povezan'))
  .catch(err => console.error('Greška pri povezivanju s MongoDB:', err));
app.use(cors());
app.use(express.json());
app.use('/api', authRoutes);
app.use('/api', userRoutes);


app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend radi!' });
});

app.get('/', (req, res) => {
  res.send('FitVenture API is running!');
});

app.use('/api', authRoutes);
app.use('/api', stravaRoutes);
app.use('/api', userRoutes);
app.use('/api', challengeRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


