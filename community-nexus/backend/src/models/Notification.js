import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String, // Recipient userId
    required: true
  },
  communityId: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Approval', 'Volunteer', 'Event', 'Announcement', 'Badge'],
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  link: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', NotificationSchema);
export default Notification;
