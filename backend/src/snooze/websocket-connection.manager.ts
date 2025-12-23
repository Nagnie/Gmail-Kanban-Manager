import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebSocketConnectionManager implements OnModuleInit {
  private readonly logger = new Logger(WebSocketConnectionManager.name);
  private readonly memoryStore = new Map<string, Set<string>>();
  private useRedis = false;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const enabled = this.configService.get('REDIS_ENABLED') === 'true';

    if (enabled) {
      try {
        await this.redis.ping();
        this.useRedis = true;
        this.logger.log('Redis enabled');
      } catch {
        this.logger.warn('Redis unavailable, using memory only');
      }
    } else {
      this.logger.log('Memory-only mode');
    }
  }

  async addConnection(userId: string, socketId: string): Promise<void> {
    // Memory (always)
    if (!this.memoryStore.has(userId)) {
      this.memoryStore.set(userId, new Set());
    }

    this.memoryStore.get(userId)!.add(socketId);

    // Redis (optional)
    if (this.useRedis) {
      try {
        await this.redis.sadd(`ws:${userId}`, socketId);
        await this.redis.expire(`ws:${userId}`, 7200);
      } catch (error) {
        this.logger.warn(`Redis add failed: ${error.message}`);
      }
    }
  }

  async removeConnection(userId: string, socketId: string): Promise<void> {
    // Memory
    const connections = this.memoryStore.get(userId);
    if (connections) {
      connections.delete(socketId);
      if (connections.size === 0) {
        this.memoryStore.delete(userId);
      }
    }

    // Redis
    if (this.useRedis) {
      try {
        await this.redis.srem(`ws:${userId}`, socketId);
        const count = await this.redis.scard(`ws:${userId}`);
        if (count === 0) {
          await this.redis.del(`ws:${userId}`);
        }
      } catch (error) {
        this.logger.warn(`Redis remove failed: ${error.message}`);
      }
    }
  }

  isConnectedLocally(userId: string): boolean {
    return (
      this.memoryStore.has(userId) && this.memoryStore.get(userId)!.size > 0
    );
  }

  async isConnectedGlobally(userId: string): Promise<boolean> {
    if (!this.useRedis) {
      return this.isConnectedLocally(userId);
    }

    try {
      const count = await this.redis.scard(`ws:${userId}`);
      return count > 0;
    } catch {
      return this.isConnectedLocally(userId);
    }
  }

  getLocalConnections(userId: string): string[] {
    return Array.from(this.memoryStore.get(userId) || []);
  }

  async getGlobalConnections(userId: string): Promise<string[]> {
    if (!this.useRedis) {
      return this.getLocalConnections(userId);
    }

    try {
      return await this.redis.smembers(`ws:${userId}`);
    } catch {
      return this.getLocalConnections(userId);
    }
  }

  getLocalStats() {
    let total = 0;
    this.memoryStore.forEach((set) => (total += set.size));
    return { users: this.memoryStore.size, connections: total };
  }

  async clearUserConnections(userId: string): Promise<void> {
    this.memoryStore.delete(userId);
    if (this.useRedis) {
      try {
        await this.redis.del(`ws:${userId}`);
      } catch {
        this.logger.warn(`Redis clear failed for user ${userId}`);
      }
    }
  }
}
