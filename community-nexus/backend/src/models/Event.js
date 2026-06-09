import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  location: {
    type: String, // Venue description or city
    required: true
  },
  communityId: {
    type: String, // Maps to Community.id
    required: true
  },
  attendees: [{
    type: String // User.id strings RSVP'ed for the meetups
  }],
  eventType: {
    type: String,
    enum: ['Meetup', 'Workshop', 'Sports Event', 'Startup Networking Events', 'Coding Sessions', 'Career Guidance Sessions', 'Webinars'],
    default: 'Meetup'
  },
  maxParticipants: {
    type: Number,
    default: 50
  }
}, {
  timestamps: true
});

const Event = mongoose.model('Event', EventSchema);
export default Event;
