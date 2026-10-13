const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  collegeName: {
    type: String,
    default: 'Campus University'
  },
  branch: {
    type: String,
    default: 'Computer Science'
  },
  graduationYear: {
    type: Number,
    default: 2026
  },
  targetRoles: {
    type: [String],
    default: ['Software Developer (SDE)']
  },
  targetCompanies: {
    type: [String],
    default: []
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  totalXp: {
    type: Number,
    default: 150
  },
    role: {
    type: String,
    enum: ['student', 'admin', 'recruiter', 'placement_officer'],
    default: 'student'
  },
  level: {
    type: Number,
    default: 1
  },
  levelTitle: {
    type: String,
    default: 'Level 1: Novice Applicant'
  },
  badges: {
    type: [String],
    // Badges are earned (see /me/gamification); nobody starts with unearned ones
    default: []
  },
  dailyQuests: {
    type: [{
      id: String,
      title: String,
      xp: Number,
      completed: Boolean,
      claimedAt: Date
    }],
    default: [
      { id: 'q1', title: 'Complete 1 Adaptive Aptitude Test', xp: 50, completed: false },
      { id: 'q2', title: 'Engage in 1 AI Mock Interview Turn', xp: 75, completed: false },
      { id: 'q3', title: 'Upload or Rescan Resume with ATS', xp: 35, completed: false }
    ]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  notificationPrefs: {
    type: Object,
    default: () => ({
      dailyReminder: true,
      interviewReportReady: true,
      streakAlert: true,
      companyDriveActivated: true,
      weeklyProgressReport: true,
      placementCountdown: true,
      studyPlanBehind: true,
      pushEnabled: false,
      whatsappEnabled: false
    })
  },
  lastPracticeDate: {
    type: Date,
    default: null
  },
  completedStudyTasks: {
    type: [String],
    default: []
  },
  tokenVersion: { type: Number, default: 0 },
  resetOtpHash: { type: String, default: null },
  resetOtpExpires: { type: Date, default: null },
  resetOtpAttempts: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret.passwordHash;
      delete ret.resetOtpHash;
      delete ret.tokenVersion;
      delete ret.resetOtpExpires;
      delete ret.resetOtpAttempts;
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model('User', userSchema);
