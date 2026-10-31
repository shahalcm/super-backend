// src/database/AuditLog.ts
import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  logId: string;
  adminId: string;
  adminName: string;
  adminRole: string;
  action: string;
  targetModule: string;
  targetId: string;
  ipAddress: string;
  details: string;
  previousValue?: any;
  newValue?: any;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    logId: { type: String, required: true, unique: true, index: true },
    adminId: { type: String, required: true, index: true },
    adminName: { type: String, required: true },
    adminRole: { type: String, required: true },
    action: { type: String, required: true, index: true },
    targetModule: { type: String, required: true, index: true },
    targetId: { type: String, required: true },
    ipAddress: { type: String, default: '127.0.0.1' },
    details: { type: String, required: true },
    previousValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = model<IAuditLog>('AuditLog', AuditLogSchema);
