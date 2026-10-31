// src/database/SupportTicket.ts
import { Schema, model, Document } from 'mongoose';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';

export interface ISupportTicket extends Document {
  ticketId: string;
  userId: string;
  userName: string;
  userPhone: string;
  role: 'customer' | 'driver' | 'rider' | 'partner';
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  messages: {
    senderId: string;
    senderName: string;
    senderRole: 'user' | 'agent';
    message: string;
    attachments?: string[];
    sentAt: Date;
  }[];
  assignedAgentId?: string;
  assignedAgentName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userPhone: { type: String, required: true },
    role: {
      type: String,
      enum: ['customer', 'driver', 'rider', 'partner'],
      required: true,
      index: true,
    },
    subject: { type: String, required: true },
    category: { type: String, default: 'General' },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    messages: [
      {
        senderId: { type: String, required: true },
        senderName: { type: String, required: true },
        senderRole: { type: String, enum: ['user', 'agent'], required: true },
        message: { type: String, required: true },
        attachments: { type: [String], default: [] },
        sentAt: { type: Date, default: Date.now },
      },
    ],
    assignedAgentId: { type: String },
    assignedAgentName: { type: String },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ userId: 1, status: 1 });

export const SupportTicketModel = model<ISupportTicket>('SupportTicket', SupportTicketSchema);
