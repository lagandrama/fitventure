const mongoose = require('mongoose');

const ChallengeProgressSchema = new mongoose.Schema({
  challenge: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  date: { type: String, index: true }, // YYYY-MM-DD
  value: { type: Number, default: 0 }  // npr. koraci, metri, minute...
}, { timestamps: true });

ChallengeProgressSchema.index({ challenge: 1, user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ChallengeProgress', ChallengeProgressSchema);
