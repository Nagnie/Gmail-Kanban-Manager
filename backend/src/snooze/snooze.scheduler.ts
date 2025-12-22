import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SnoozeService } from './snooze.service';

@Injectable()
export class SnoozeScheduler {
  private readonly logger = new Logger(SnoozeScheduler.name);

  constructor(private readonly snoozeService: SnoozeService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleSnoozeRestore() {
    this.logger.debug('⏰ Checking for due snoozes...');

    try {
      const restoredCount = await this.snoozeService.restoreDueSnoozes();

      if (restoredCount > 0) {
        this.logger.log(`Restored ${restoredCount} snoozed email(s)`);
      }
    } catch (error) {
      this.logger.error(`Error in snooze scheduler: ${error.message}`);
    }
  }
}
