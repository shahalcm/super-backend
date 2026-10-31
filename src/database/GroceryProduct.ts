// src/database/GroceryProduct.ts
import { Schema, model, Document } from 'mongoose';

export interface IGroceryProduct extends Document {
  productId: string;
  partnerId: string;
  name: string;
  brand?: string;
  category: string;
  description?: string;
  sku: string;
  sellingPrice: number;
  mrp: number;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: string;
  images: string[];
  inStock: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroceryProductSchema = new Schema<IGroceryProduct>(
  {
    productId: { type: String, required: true, unique: true, index: true },
    partnerId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    brand: { type: String, trim: true },
    category: { type: String, required: true, index: true },
    description: { type: String },
    sku: { type: String, required: true, uppercase: true, trim: true },
    sellingPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 10, min: 0 },
    unit: { type: String, default: 'unit' },
    images: { type: [String], default: [] },
    inStock: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

GroceryProductSchema.index({ partnerId: 1, category: 1, inStock: 1 });

export const GroceryProductModel = model<IGroceryProduct>(
  'GroceryProduct',
  GroceryProductSchema
);
