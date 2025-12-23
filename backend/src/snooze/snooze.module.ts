import { Module } from '@nestjs/common';
import { SnoozeService } from './snooze.service';
import { GmailModule } from '../gmail/gmail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSnooze } from '../email/entities/email-snooze.entity';
import { SnoozeScheduler } from 'src/snooze/snooze.scheduler';
import { EmailKanbanOrder } from 'src/email/entities/email-kanban-order.entity';
import { SnoozeController } from './snooze.controller';
import { KanbanColumnConfig } from 'src/kanban/entities/kanban-column-config.entity';
import { User } from 'src/user/entities/user.entity';
import { SnoozeGateway } from 'src/snooze/snooze.gateway';
import { WebSocketConnectionManager } from 'src/snooze/websocket-connection.manager';

@Module({
  imports: [
    GmailModule,
    TypeOrmModule.forFeature([
      EmailSnooze,
      EmailKanbanOrder,
      KanbanColumnConfig,
      User,
    ]),
  ],
  providers: [
    SnoozeService,
    SnoozeScheduler,
    SnoozeGateway,
    WebSocketConnectionManager,
  ],
  exports: [SnoozeService, SnoozeGateway, WebSocketConnectionManager],
  controllers: [SnoozeController],
})
export class SnoozeModule {}
