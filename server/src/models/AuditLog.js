const mongoose = require('mongoose');

// Security / admin audit trail (spec §24)
const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  actorRole: { type: String, default: null },
  action: { type: String, required: true, index: true },
  targetType: { type: String, default: null },
  targetId: { type: String, default: null },
  requestId: { type: String, default: null },
  ip: { type: String, default: null },
  details: { type: Object, default: {} }
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
