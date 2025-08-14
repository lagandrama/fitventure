// backend/models/activity.js
const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', index: true },
    source: { type: String, enum: ['strava'], required: true },
    sourceId: { type: String, required: true, index: true }, // Strava activity id
    type: { type: String, index: true }, // 'Run', 'Ride', 'Walk', ...
    startDate: { type: Date, index: true },
    movingTime: { type: Number }, // seconds
    elapsedTime: { type: Number }, // seconds
    distance: { type: Number }, // meters
    totalElevationGain: { type: Number }, // meters
    averageHeartrate: { type: Number },
    maxHeartrate: { type: Number },
    calories: { type: Number },
    raw: { type: Object } // full raw payload for debugging/future needs
  },
  { timestamps: true }
);

ActivitySchema.index({ user: 1, startDate: -1 });

module.exports = mongoose.model('activity', ActivitySchema);
