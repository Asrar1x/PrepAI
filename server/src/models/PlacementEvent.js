const mongoose = require('mongoose');

// A scheduled campus mock event or an activated company drive (kind = 'drive').
const placementEventSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ['event', 'drive'],
    default: 'event',
    index: true
  },
  title: { type: String, required: true },
  company: { type: String, default: '' },
  roleTitle: { type: String, default: '' },
  batch: { type: String, default: 'All Batches' },
  date: { type: Date, required: true, index: true },
  time: { type: String, default: '' },
  targetCount: { type: Number, default: 0 },
  durationDays: { type: Number, default: 7 },
  mandatoryMockRounds: { type: Number, default: 0 },
  cutoffPercentage: { type: Number, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model('PlacementEvent', placementEventSchema);
