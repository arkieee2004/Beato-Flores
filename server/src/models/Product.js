import mongoose from 'mongoose';
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  color: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  unit: { type: String, enum: ['stems', 'pieces', 'bundles', 'items'], default: 'stems' },
  costPrice: { type: Number, min: 0, default: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  lowStockThreshold: { type: Number, min: 0, default: 10 },
  imageUrl: { type: String, default: '' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
productSchema.index({ name: 'text', category: 'text', color: 'text' });
export default mongoose.model('Product', productSchema);
