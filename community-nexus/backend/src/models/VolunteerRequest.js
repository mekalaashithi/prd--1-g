import mongoose from 'mongoose';

const VolunteerRequestSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true
  },
  eventId: {
    type: String,
    required: true
  },
  communityId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  motivation: {
    type: String,
    required: true
  },
  skills: {
    type: String,
    required: true
  },
  experience: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const VolunteerRequest = mongoose.model('VolunteerRequest', VolunteerRequestSchema);
export default VolunteerRequest;
