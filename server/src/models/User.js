import mongoose from 'mongoose';
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, trim: true, default: '' },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'employee', 'client'], default: 'client', required: true },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  profileImage: { type: String, default: '' },
  profileImagePublicId: { type: String, default: '' }
}, { timestamps: true });
userSchema.set('toJSON', { transform: (_doc, ret) => { delete ret.passwordHash; delete ret.__v; return ret; } });
export default mongoose.model('User', userSchema);
