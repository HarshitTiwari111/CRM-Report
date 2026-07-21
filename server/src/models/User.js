const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['superadmin', 'admin', 'manager', 'employee'],
      default: 'employee',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    designation: {
      type: String,
      trim: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    joiningDate: {
      type: Date,
    },
    profilePhoto: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    // Brute-force protection
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    // TOTP two-factor authentication
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    // Secret generated during setup, promoted to twoFactorSecret once verified
    twoFactorPendingSecret: {
      type: String,
      select: false,
    },
    // Devices this user has logged in from (for new-device alerts)
    knownDevices: {
      type: [
        {
          _id: false,
          deviceHash: String,
          userAgent: String,
          ip: String,
          firstSeen: Date,
          lastSeen: Date,
        },
      ],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function preSave(next) {
  if (!this.employeeId) {
    const last = await mongoose.model('User').findOne({}, 'employeeId').sort({ employeeId: -1 });
    const lastNum = last?.employeeId ? parseInt(last.employeeId.replace('EMP', ''), 10) || 0 : 0;
    this.employeeId = `EMP${String(lastNum + 1).padStart(4, '0')}`;
  }
  next();
});

userSchema.index({ department: 1 });
userSchema.index({ team: 1 });
userSchema.index({ manager: 1 });
userSchema.index({ name: 'text', email: 'text' });

module.exports = mongoose.model('User', userSchema);
