import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { GmailService } from './gmail.service';
import { WebSocketConnectionManager } from 'src/snooze/websocket-connection.manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SnoozeGateway } from 'src/snooze/snooze.gateway';
import { EmailSyncEvent } from 'src/email/events/email_sync.event';
import { EmailSynceService } from 'src/email/sync/email_sync.service';

@Injectable()
export class GmailScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GmailScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly gmailService: GmailService,
    private readonly eventEmitter: EventEmitter2,
    private readonly connectionManager: WebSocketConnectionManager,
    private readonly snoozeGateway: SnoozeGateway,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => EmailSynceService))
    private readonly emailSyncService: EmailSynceService,
  ) {}

  onModuleInit() {
    const enabled = this.configService.get<string>('GMAIL_POLL_ENABLED');
    if (enabled === 'false') {
      this.logger.log('Gmail poller disabled by config');
      return;
    }

    const intervalSec = parseInt(
      this.configService.get<string>('GMAIL_POLL_INTERVAL_SECONDS') || '60',
      10,
    );

    const intervalMs = Math.max(1000, intervalSec * 1000);

    this.logger.log(`Starting Gmail poller (interval ${intervalSec}s)`);

    this.timer = setInterval(() => {
      void this.pollForNewEmails().catch((err) =>
        this.logger.error(`Gmail poller error: ${err.message || err}`),
      );
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.log('Gmail poller stopped');
  }

  // Poll method (invoked by timer)
  async pollForNewEmails() {
    this.logger.debug('Polling for new Gmail messages...');

    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.google_refresh_token IS NOT NULL')
        .getMany();

      for (const user of users) {
        try {
          const isOnline = await this.connectionManager.isConnectedGlobally(
            user.id.toString(),
          );

          if (!isOnline) continue;

          // Emit event to trigger history sync in listener
          this.eventEmitter.emit(
            'email.sync',
            new EmailSyncEvent(user.id, undefined, 0, []),
          );
        } catch (e) {
          this.logger.warn(`Polling failed for user ${user.id}: ${e.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Gmail poller error: ${error.message}`);
    }
  }
}
