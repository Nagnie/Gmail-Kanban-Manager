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
import { OpenRouterModule } from 'src/open-router/open-router.module';
import { OpenRouterService } from 'src/open-router/open-router.service';

@Module({
  imports: [
    GmailModule,
    TypeOrmModule.forFeature([
      EmailPriority,
      EmailSummary,
      EmailKanbanOrder,
      EmailSnooze,
    ]),
    SnoozeModule,
    OpenRouterModule
  ],
  controllers: [KanbanController],
  providers: [KanbanService, OpenRouterService],
})
export class KanbanModule {}
