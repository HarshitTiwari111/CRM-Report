const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    taskType: {
      type: String,
      enum: [
        'development',
        'bugfix',
        'meeting',
        'testing',
        'research',
        'design',
        'support',
        'deployment',
        'documentation',
        'training',
        'other',
      ],
      default: 'other',
    },
    startTime: {
      type: String,
      trim: true,
    },
    endTime: {
      type: String,
      trim: true,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    taskDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedCompletion: {
      type: Date,
    },
    actualCompletion: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'hold', 'cancelled'],
      default: 'pending',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    githubLink: {
      type: String,
      trim: true,
      default: '',
    },
    taskUrl: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

taskSchema.pre('validate', function preValidate(next) {
  if (this.status === 'completed' && !this.actualCompletion) {
    this.actualCompletion = new Date();
  }

  next();
});

taskSchema.index({ assignedTo: 1, taskDate: -1 });
taskSchema.index({ status: 1 });
taskSchema.index({ department: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ title: 'text', description: 'text', remarks: 'text' });

module.exports = mongoose.model('Task', taskSchema);
