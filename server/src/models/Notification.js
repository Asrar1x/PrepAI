const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['report_ready', 'company_drive', 'streak_alert', 'daily_reminder', 'event_scheduled', 'system'],
    default: 'system'
  },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  actionUrl: { type: String, default: null },
  severity: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  isRead: { type: Boolean, default: false }
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

module.exports = mongoose.model('Notification', notificationSchema);
