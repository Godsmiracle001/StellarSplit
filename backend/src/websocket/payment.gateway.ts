import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class PaymentGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private logger: Logger = new Logger('PaymentGateway');

  afterInit(server: Server) {
    this.logger.log('Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, payload: { roomId: string }) {
    client.join(payload.roomId);
    return { event: 'joined-room', data: { roomId: payload.roomId } };
  }

  // Emit payment status updates
  emitPaymentStatusUpdate(roomId: string, data: any) {
    this.server.to(roomId).emit('payment-status-update', data);
  }

  // Emit split completion updates
  emitSplitCompletion(roomId: string, data: any) {
    this.server.to(roomId).emit('split-completion', data);
  }

  // Emit general payment notification
  emitPaymentNotification(roomId: string, data: any) {
    this.server.to(roomId).emit('payment-notification', data);
  }

  // ============ Activity Feed Updates ============

  // Send new activity to user
  sendActivityUpdate(userId: string, activity: any) {
    this.server.to(`user-${userId}`).emit('activity-new', activity);
  }

  // Send activity read status update
  sendActivityReadUpdate(userId: string, activityIds: string[]) {
    this.server.to(`user-${userId}`).emit('activity-read', { activityIds });
  }

  // Send mark all as read update
  sendActivityReadAllUpdate(userId: string) {
    this.server.to(`user-${userId}`).emit('activity-read-all', {});
  }

  @SubscribeMessage('join-user-room')
  handleJoinUserRoom(client: Socket, payload: { userId: string }) {
    client.join(`user-${payload.userId}`);
    return { event: 'joined-user-room', data: { userId: payload.userId } };
  }
}

// Export with alias for compatibility
export { PaymentGateway as WebSocketGateway };