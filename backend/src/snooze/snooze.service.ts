import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailSnooze } from '../email/entities/email-snooze.entity';
import { EmailKanbanOrder } from '../email/entities/email-kanban-order.entity';
import { LessThanOrEqual, Repository } from 'typeorm';
import { GmailService } from '../gmail/gmail.service';
import { SnoozePreset } from '../kanban/dto/snooze-email.dto';

@Injectable()
export class SnoozeService {
  constructor(
    @InjectRepository(EmailSnooze)
    private readonly snoozeRepository: Repository<EmailSnooze>,

    @InjectRepository(EmailKanbanOrder)
    private readonly orderRepository: Repository<EmailKanbanOrder>,

    private readonly gmailService: GmailService,
  ) {}

  calculateSnoozeTime(preset: SnoozePreset, customDate?: string): Date {
    const now = new Date();

    switch (preset) {
      case SnoozePreset.LATER_TODAY:
        return new Date(now.getTime() + 6 * 60 * 60 * 1000);

      case SnoozePreset.TOMORROW: {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow;
      }

      case SnoozePreset.THIS_WEEKEND: {
        const saturday = new Date(now);
        const currentDay = now.getDay();
        let daysUntilSaturday = 6 - currentDay;

        if (daysUntilSaturday <= 0) {
          daysUntilSaturday += 7;
        }

        saturday.setDate(saturday.getDate() + daysUntilSaturday);
        saturday.setHours(9, 0, 0, 0);
        return saturday;
      }

      case SnoozePreset.NEXT_WEEK: {
        const nextMonday = new Date(now);
        const currentDayOfWeek = now.getDay();
        let daysUntilMonday = (8 - currentDayOfWeek) % 7;

        if (daysUntilMonday === 0) {
          daysUntilMonday = 7;
        }

        nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
        nextMonday.setHours(9, 0, 0, 0);
        return nextMonday;
      }

      case SnoozePreset.CUSTOM: {
        if (!customDate) {
          throw new BadRequestException('Custom date is required');
        }

        const custom = new Date(customDate);

        if (custom <= now) {
          throw new BadRequestException('Custom date must be in the future');
        }

        return custom;
      }

      default:
        throw new BadRequestException(
          `Invalid snooze preset: ${preset as string}`,
        );
    }
  }

  getSnoozeDescription(snoozeUntil: Date): string {
    const now = new Date();
    const diff = snoozeUntil.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const fullFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (hours < 24) {
      return `Snoozed until today at ${timeFormatter.format(snoozeUntil)}`;
    } else if (days === 1) {
      return `Snoozed until tomorrow at ${timeFormatter.format(snoozeUntil)}`;
    } else if (days < 7) {
      return `Snoozed until ${fullFormatter.format(snoozeUntil)}`;
    } else {
      return `Snoozed until ${snoozeUntil.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}`;
    }
  }

  async findSnoozedEmails(userId: number): Promise<EmailSnooze[]> {
    return this.snoozeRepository.find({
      where: {
        userId,
        isRestored: false,
      },
      order: {
        snoozeUntil: 'ASC',
      },
    });
  }

  async findSnoozeByEmailId(
    userId: number,
    emailId: string,
  ): Promise<EmailSnooze | null> {
    return this.snoozeRepository.findOne({
      where: {
        userId,
        emailId,
        isRestored: false,
      },
    });
  }

  async unsnooze(userId: number, emailId: string): Promise<void> {
    const snooze = await this.findSnoozeByEmailId(userId, emailId);

    if (!snooze) {
      throw new NotFoundException('Snooze record not found');
    }

    await this.restoreEmail(snooze);

    snooze.isRestored = true;
    snooze.restoredAt = new Date();
    await this.snoozeRepository.save(snooze);
  }

  async restoreEmail(snooze: EmailSnooze): Promise<void> {
    const columnLabelMap = {
      inbox: ['INBOX'],
      todo: ['Kanban/To Do'],
      in_progress: ['Kanban/In Progress'],
      done: ['Kanban/Done'],
    };

    const restoreLabels: string[] = columnLabelMap[snooze.originalColumn] || [
      'INBOX',
    ];

    const restoreLabelIds = await this.gmailService.convertLabelNamesToIds(
      snooze.userId,
      restoreLabels,
    );

    const removeLabelIds =
      (await this.gmailService.getLabelIdByName(
        snooze.userId,
        'Kanban/Snoozed',
      )) || '';

    await this.gmailService.modifyMessage(snooze.userId, snooze.emailId, {
      addLabelIds: restoreLabelIds,
      removeLabelIds: [removeLabelIds],
    });

    // Get max order in target column
    const maxOrderResult = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId: snooze.userId })
      .andWhere('order.columnId = :columnId', {
        columnId: snooze.originalColumn,
      })
      .select('MAX(order.order)', 'maxOrder')
      .getRawOne();

    const maxOrder = maxOrderResult?.maxOrder ?? -1;
    const newOrder = maxOrder + 1;

    await this.orderRepository.save({
      userId: snooze.userId,
      emailId: snooze.emailId,
      columnId: snooze.originalColumn,
      order: newOrder,
    });
  }

  async restoreDueSnoozes(): Promise<number> {
    const now = new Date();

    const dueSnoozes = await this.snoozeRepository.find({
      where: {
        isRestored: false,
        snoozeUntil: LessThanOrEqual(now),
      },
    });

    let restoredCount = 0;

    for (const snooze of dueSnoozes) {
      try {
        await this.restoreEmail(snooze);

        snooze.isRestored = true;
        snooze.restoredAt = new Date();
        await this.snoozeRepository.save(snooze);

        restoredCount++;
      } catch (error) {
        console.log('🚀 ~ SnoozeService ~ restoreDueSnoozes ~ error:', error);
      }
    }

    return restoredCount;
  }
}
