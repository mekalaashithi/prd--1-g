import mongoose from 'mongoose';

const AchievementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String, // Recipient member
    required: true
  },
  badgeType: {
    type: String, // E.g., 'Core Joiner', 'Event Enthusiast', 'Volunteer Star', 'Roster Master'
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Achievement = mongoose.model('Achievement', AchievementSchema);
export default Achievement;
