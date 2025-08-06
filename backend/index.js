const authRoutes = require('./routes/auth');
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


app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend radi!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
