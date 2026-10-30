import mongoose from 'mongoose';

const systemUpdateSchema = new mongoose.Schema({
  assignDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  completeDate: {
    type: String, // YYYY-MM-DD
    default: ''
  },
  type: {
    type: String,
    enum: ['Bug Fix', 'New Feature', 'System Optimization', 'Maintenance'],
    required: true
  },
  section: {
    type: String,
    required: true // උදා: 'B/L Operations', 'Rolling Room', 'Dashboard'
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Completed'
  },
  enteredBy: {
    type: String,
    default: 'System Admin'
  }
}, { timestamps: true });

export default mongoose.model('SystemUpdate', systemUpdateSchema);