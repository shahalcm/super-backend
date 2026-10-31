// src/sockets/index.ts
import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AuthUserPayload } from '../middleware/auth.js';

let io: Server | null = null;

export function initializeSockets(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  // Authentication Middleware for Socket.IO
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      // Allow anonymous connection for public tracking if necessary, or assign guest room
      socket.data.user = { userId: `guest_${socket.id}`, roles: ['CUSTOMER'] };
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUserPayload;
      socket.data.user = decoded;
      next();
    } catch (err) {
      logger.warn({ error: (err as any).message }, 'Socket.IO authentication failed. Allowing guest.');
      socket.data.user = { userId: `guest_${socket.id}`, roles: ['CUSTOMER'] };
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    logger.info(`🔌 Socket connected: ${socket.id} (User: ${user?.userId})`);

    // Automatically join private user room
    if (user?.userId) {
      socket.join(`user:${user.userId}`);
    }

    if (user?.driverId) {
      socket.join(`driver:${user.driverId}`);
      socket.join('drivers_pool');
    }

    if (user?.riderId) {
      socket.join(`rider:${user.riderId}`);
      socket.join('riders_pool');
    }

    if (user?.partnerId) {
      socket.join(`partner:${user.partnerId}`);
    }

    if (user?.roles?.includes('ADMIN') || user?.roles?.includes('SUPER_ADMIN')) {
      socket.join('admin_room');
    }

    // Join ride tracking room
    socket.on('join:ride', ({ rideId }: { rideId: string }) => {
      socket.join(`ride:${rideId}`);
      logger.info(`Socket ${socket.id} joined room: ride:${rideId}`);
    });

    // Leave ride tracking room
    socket.on('leave:ride', ({ rideId }: { rideId: string }) => {
      socket.leave(`ride:${rideId}`);
    });

    // Driver live telemetry stream (rate throttled by client)
    socket.on('taxi:driver:location', (data: { rideId?: string; latitude: number; longitude: number; heading?: number }) => {
      if (data.rideId) {
        socket.to(`ride:${data.rideId}`).emit('taxi:driver:location', {
          driverId: user?.driverId,
          latitude: data.latitude,
          longitude: data.longitude,
          heading: data.heading || 0,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Join delivery tracking room
    socket.on('join:delivery', ({ deliveryId }: { deliveryId: string }) => {
      socket.join(`delivery:${deliveryId}`);
      logger.info(`Socket ${socket.id} joined room: delivery:${deliveryId}`);
    });

    // Delivery rider live telemetry
    socket.on('delivery:location', (data: { deliveryId?: string; latitude: number; longitude: number }) => {
      if (data.deliveryId) {
        socket.to(`delivery:${data.deliveryId}`).emit('delivery:location', {
          riderId: user?.riderId,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: new Date().toISOString(),
        });
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO is not initialized yet. Call initializeSockets first.');
  }
  return io;
}

// Event Dispatch Helpers
export const socketEvents = {
  // Taxi events
  emitRideRequested: (ride: any) => {
    if (io) io.to('drivers_pool').emit('taxi:ride:request', ride);
  },
  emitDriverAssigned: (rideId: string, driver: any) => {
    if (io) io.to(`ride:${rideId}`).emit('taxi:driver:assigned', driver);
  },
  emitRideStarted: (rideId: string) => {
    if (io) io.to(`ride:${rideId}`).emit('taxi:ride:started', { status: 'trip_started' });
  },
  emitRideCompleted: (rideId: string, summary: any) => {
    if (io) io.to(`ride:${rideId}`).emit('taxi:ride:completed', summary);
  },

  // Delivery events
  emitDeliveryAssigned: (riderId: string, delivery: any) => {
    if (io) io.to(`rider:${riderId}`).emit('delivery:assigned', delivery);
  },
  emitDeliveryPickedUp: (deliveryId: string) => {
    if (io) io.to(`delivery:${deliveryId}`).emit('delivery:picked-up', { status: 'picked_up' });
  },
  emitDeliveryCompleted: (deliveryId: string) => {
    if (io) io.to(`delivery:${deliveryId}`).emit('delivery:completed', { status: 'delivered' });
  },

  // Order events
  emitOrderStatusUpdated: (customerId: string, order: any) => {
    if (io) io.to(`user:${customerId}`).emit('order:status', order);
  },
  emitNewOrderToPartner: (partnerId: string, order: any) => {
    if (io) io.to(`partner:${partnerId}`).emit('order:created', order);
  },
};
