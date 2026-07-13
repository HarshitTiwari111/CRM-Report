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
      enum: ['superadmin', 'employee'],
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
