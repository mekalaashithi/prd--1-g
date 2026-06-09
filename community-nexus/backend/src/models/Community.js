import mongoose from 'mongoose';

const CommunitySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Tech', 'College', 'Startup', 'Sports', 'NGO', 'Cultural', 'Gaming'],
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  banner: {
    type: String,
    default: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=600'
  },
  logo: {
    type: String,
    default: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=150'
  },
  adminId: {
    type: String, // Maps to User.id (Prefix A/M e.g.)
    required: true
  },
  members: [{
    type: String // List of User.id strings currently active inside this circle
  }],
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  }
}, {
  timestamps: true
});

const Community = mongoose.model('Community', CommunitySchema);
export default Community;
