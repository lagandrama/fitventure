// backend/models/user.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  profilePic: { type: String, default: "" }, // <-- zarez je ovdje bio problem
  strava: {
    athleteId: { type: Number },
    accessToken: { type: String },
    refreshToken: { type: String },
    tokenExpiresAt: { type: Date }
  }
});

module.exports = mongoose.model('user', userSchema); // usklađeno s ref: 'user'
