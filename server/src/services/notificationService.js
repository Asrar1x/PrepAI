const Notification = require('../models/Notification');
const User = require('../models/User');

// Maps a notification type to the user preference that controls it.
const PREF_FOR_TYPE = {
  report_ready: 'interviewReportReady',
  company_drive: 'companyDriveActivated',
  streak_alert: 'streakAlert',
  daily_reminder: 'dailyReminder',
  event_scheduled: 'companyDriveActivated'
};

function isEnabled(user, type) {
  const pref = PREF_FOR_TYPE[type];
  if (!pref) return true;
  const prefs = user.notificationPrefs || {};
  return prefs[pref] !== false;
}

async function notifyUser(user, payload) {
  if (!user || !isEnabled(user, payload.type)) return null;
  try {
    return await Notification.create({ userId: user._id, ...payload });
  } catch (err) {
    console.warn('[Notifications] Failed to create notification:', err.message);
    return null;
  }
}

async function notifyAllStudents(payload) {
  const students = await User.find({ role: 'student', isActive: true });
  const docs = students
    .filter(u => isEnabled(u, payload.type))
    .map(u => ({ userId: u._id, ...payload }));
  if (docs.length) await Notification.insertMany(docs);
  return docs.length;
}

module.exports = { notifyUser, notifyAllStudents };
