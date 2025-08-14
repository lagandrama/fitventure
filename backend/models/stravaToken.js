const mongoose = require('mongoose');

const StravaTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, unique: true },
  accessToken: String,
  refreshToken: String,
  expiresAt: Number // epoch seconds
}, { timestamps: true });

module.exports = mongoose.model('StravaToken', StravaTokenSchema);
