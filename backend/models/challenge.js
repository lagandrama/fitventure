const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 2000 },
  type: { type: String, enum: ['running', 'yoga', 'hiit', 'steps', 'weightloss', 'custom'], required: true },
  privacy: { type: String, enum: ['public', 'private'], default: 'public' },
  entryFee: { type: Number, default: 0, min: 0 },
  rules: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate:   { type: Date, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['upcoming', 'active', 'ended'], default: 'upcoming' }
}, { timestamps: true });

challengeSchema.index({ title: 'text', description: 'text' });
challengeSchema.index({ type: 1, privacy: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);
