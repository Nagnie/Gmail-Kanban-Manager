import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WebSocketConnectionManager } from './websocket-connection.manager';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { Repository } from 'typeorm';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: 'snooze',
})
export class SnoozeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SnoozeGateway.name);

  constructor(
    private readonly connectionManager: WebSocketConnectionManager,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;

    if (userId) {
      await this.connectionManager.removeConnection(userId, client.id);
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userEmail: string },
  ) {
    const { userEmail } = data;

    const user = await this.userRepository.findOne({
      where: { email: userEmail },
    });

    const userId = user ? user.id.toString() : null;

    if (!userId) {
      return { success: false, error: 'userId required' };
    }

    client.join(`user:${userId}`);
    client.data.userId = userId;

    await this.connectionManager.addConnection(userId, client.id);

    this.logger.log(`User ${userId} joined`);

    return { success: true };
  }

  @SubscribeMessage('leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userEmail: string },
  ) {
    const { userEmail } = data;

    const user = await this.userRepository.findOne({
      where: { email: userEmail },
    });

    const userId = user ? user.id.toString() : null;

    if (!userId) {
      return { success: false, error: 'userId required' };
    }

    client.leave(`user:${userId}`);
    await this.connectionManager.removeConnection(userId, client.id);
    return { success: true };
  }

  // Main method: Notify user about restored email
  notifyEmailRestored(userId: string, emailId: string, columnId: string) {
    this.server.to(`user:${userId}`).emit('email:restored', {
      emailId,
      columnId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Notified user ${userId} about email ${emailId}`);
  }

  // Check if user is online
  async isUserOnline(userId: string): Promise<boolean> {
    return await this.connectionManager.isConnectedGlobally(userId);
  }
}
