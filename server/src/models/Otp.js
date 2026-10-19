import mongoose from 'mongoose';
const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, index: true },
  purpose: { type: String, enum: ['verify-email', 'reset-password'], required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
  attempts: { type: Number, default: 0 },
  consumed: { type: Boolean, default: false }
}, { timestamps: true });
export default mongoose.model('Otp', otpSchema);
