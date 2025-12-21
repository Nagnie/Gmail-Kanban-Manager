import { Module } from '@nestjs/common';
import { SnoozeService } from './snooze.service';
import { GmailModule } from '../gmail/gmail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSnooze } from '../email/entities/email-snooze.entity';
import { SnoozeScheduler } from 'src/snooze/snooze.scheduler';
import { EmailKanbanOrder } from 'src/email/entities/email-kanban-order.entity';
import { SnoozeController } from './snooze.controller';

@Module({
  imports: [
    GmailModule,
    TypeOrmModule.forFeature([EmailSnooze, EmailKanbanOrder]),
  ],
  providers: [SnoozeService, SnoozeScheduler],
  exports: [SnoozeService],
  controllers: [SnoozeController],
})
export class SnoozeModule {}
