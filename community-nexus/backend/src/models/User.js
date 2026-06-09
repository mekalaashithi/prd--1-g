import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
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
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['Visitor', 'Member', 'Community Admin', 'Super Admin'],
    default: 'Member'
  },
  profileImage: {
    type: String,
    default: ''
  },
  location: {
    latitude: { type: Number, default: 17.3850 },
    longitude: { type: Number, default: 78.4867 },
    city: { type: String, default: 'Hyderabad' },
    state: { type: String, default: 'Telangana' }
  },
  interests: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Methods to sanitize output (hide hashes)
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', UserSchema);
export default User;
