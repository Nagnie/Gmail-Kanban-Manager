import { Module } from '@nestjs/common';
import { KanbanController } from './kanban.controller';
import { KanbanService } from './kanban.service';
import { GmailModule } from '../gmail/gmail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailPriority } from '../email/entities/email-priority.entity';
import { EmailSummary } from '../email/entities/email-summary.entity';
import { EmailKanbanOrder } from '../email/entities/email-kanban-order.entity';
import { EmailSnooze } from '../email/entities/email-snooze.entity';
import { SnoozeModule } from '../snooze/snooze.module';
import { KanbanColumnConfig } from 'src/kanban/entities/kanban-column-config.entity';

@Module({
  imports: [
    GmailModule,
    TypeOrmModule.forFeature([
      EmailPriority,
      EmailSummary,
      EmailKanbanOrder,
      EmailSnooze,
      KanbanColumnConfig,
    ]),
    SnoozeModule,
  ],
  controllers: [KanbanController],
  providers: [KanbanService],
})
export class KanbanModule {}
