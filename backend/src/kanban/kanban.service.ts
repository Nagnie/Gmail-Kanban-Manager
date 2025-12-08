import { BadRequestException, Injectable } from '@nestjs/common';
import { KanbanColumnDto, KanbanColumnId } from './dto/kanban-column.dto';
import { GetColumnQueryDto } from './dto/get-column.dto';
import { GmailService } from '../gmail/gmail.service';
import { EmailCardDto } from './dto/email-card.dto';
import { parseEmailDetail } from '../utils/email.util';
import { In, Repository } from 'typeorm';
import { EmailPriority } from '../email/entities/email-priority.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailSummary } from '../email/entities/email-summary.entity';
import { KanbanColumnPaginationDto } from './dto/kanban-pagination.dto';
import { EmailKanbanOrder } from '../email/entities/email-kanban-order.entity';
import { MoveEmailDto, MoveEmailResponseDto } from './dto/move-email.dto';
import {
  BatchMoveEmailDto,
  BatchMoveEmailResponseDto,
} from './dto/batch-move-email.dto';
import {
  ReorderEmailsDto,
  ReorderEmailsResponseDto,
} from './dto/reorder-email.dto';

@Injectable()
export class KanbanService {
  constructor(
    private readonly gmailService: GmailService,

    @InjectRepository(EmailPriority)
    private readonly priorityRepository: Repository<EmailPriority>,

    @InjectRepository(EmailSummary)
    private readonly summaryRepository: Repository<EmailSummary>,

    @InjectRepository(EmailKanbanOrder)
    private readonly orderRepository: Repository<EmailKanbanOrder>,
  ) {}

  getColumnsMetadata() {
    const columns = {
      [KanbanColumnId.INBOX]: {
        id: KanbanColumnId.INBOX,
        name: 'Inbox',
        labelIds: ['INBOX'],
        count: 0,
        color: '#1976d2',
        order: 0,
      },
      [KanbanColumnId.TODO]: {
        id: KanbanColumnId.TODO,
        name: 'To Do',
        labelIds: ['Kanban/To Do'],
        count: 0,
        color: '#f57c00',
        order: 1,
      },
      [KanbanColumnId.IN_PROGRESS]: {
        id: KanbanColumnId.IN_PROGRESS,
        name: 'In Progress',
        labelIds: ['Kanban/In Progress'],
        count: 0,
        color: '#fbc02d',
        order: 2,
      },
      [KanbanColumnId.DONE]: {
        id: KanbanColumnId.DONE,
        name: 'Done',
        labelIds: ['Kanban/Done'],
        count: 0,
        color: '#388e3c',
        order: 3,
      },
      [KanbanColumnId.SNOOZED]: {
        id: KanbanColumnId.SNOOZED,
        name: 'Snoozed',
        labelIds: ['Kanban/Snoozed'],
        count: 0,
        color: '#7b1fa2',
        order: 4,
      },
    };

    return { columns };
  }

  async getKanbanColumn(
    userId: number,
    columnId: KanbanColumnId,
    query: GetColumnQueryDto,
  ): Promise<KanbanColumnDto> {
    const columnConfigMap = this.getColumnsMetadata().columns;

    const config = columnConfigMap[columnId];

    if (!config) {
      throw new BadRequestException(`Invalid column ID: ${columnId}`);
    }

    const gmailQuery = this.buildColumnQueryWithFilters(config.labelIds, query);

    const response = await this.gmailService.listMessages(
      userId,
      gmailQuery,
      query.pageToken,
    );

    const messages = response.messages || [];

    const emailCards = await Promise.all(
      messages.map(async (msg) => {
        try {
          return await this.buildEmailCard(userId, msg.id!);
        } catch (error) {
          console.log('🚀 ~ KanbanService ~ getKanbanColumn ~ error:', error);
          return null;
        }
      }),
    );

    const validCards = emailCards.filter((card) => card !== null);

    const emailIds = validCards.map((card) => card.id);

    const priorities = await this.getEmailPriorities(userId, emailIds);
    const summaries = await this.getEmailSummaries(userId, emailIds);

    const cardsWithMetadata = validCards.map((card) => {
      const priority = priorities.get(card.id);
      const summary = summaries.get(card.id);

      return {
        ...card,
        isPinned: priority?.isPinned ?? false,
        priorityLevel: priority?.priorityLevel ?? 0,
        summary: summary?.summary || null,
        hasSummary: !!summary,
        summarizedAt: summary?.createdAt?.toISOString() || null,
      };
    });

    let sortedCards: EmailCardDto[];
    let pinnedCount = 0;

    if (columnId === KanbanColumnId.INBOX) {
      const pinned = cardsWithMetadata.filter((c) => c.isPinned);
      const regular = cardsWithMetadata.filter((c) => !c.isPinned);

      const sortedPinned = pinned.sort((a, b) => {
        const priorityA = priorities.get(a.id);
        const priorityB = priorities.get(b.id);
        return (priorityA?.pinnedOrder ?? 0) - (priorityB?.pinnedOrder ?? 0);
      });

      const sortedRegular = regular.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      sortedCards = [...sortedPinned, ...sortedRegular];
      pinnedCount = sortedPinned.length;
    } else {
      const customOrders = await this.getCustomOrders(
        userId,
        columnId,
        emailIds,
      );

      sortedCards = cardsWithMetadata.sort((a, b) => {
        const orderA = customOrders.get(a.id);
        const orderB = customOrders.get(b.id);

        if (orderA !== undefined && orderB !== undefined) {
          return orderA - orderB;
        }
        if (orderA !== undefined) return -1;
        if (orderB !== undefined) return 1;

        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }

    const pagination: KanbanColumnPaginationDto = {
      nextPageToken: response.nextPageToken || undefined,
      estimatedTotal: response.resultSizeEstimate || sortedCards.length,
      hasMore: !!response.nextPageToken,
    };

    return {
      id: config.id,
      name: config.name,
      labelIds: config.labelIds,
      count: sortedCards.length,
      emails: sortedCards,
      color: config.color,
      order: config.order,
      pagination,
      canReorder: columnId !== KanbanColumnId.INBOX,
      pinnedCount,
    };
  }

  async moveEmailToColumn(
    userId: number,
    emailId: string,
    moveDto: MoveEmailDto,
  ): Promise<MoveEmailResponseDto> {
    if (moveDto.sourceColumn === moveDto.targetColumn) {
      throw new BadRequestException(
        'Cannot move to same column. Use reorder endpoint instead.',
      );
    }

    const columnConfigMap = this.getColumnsMetadata().columns;

    const targetConfig = columnConfigMap[moveDto.targetColumn];
    const targetLabels = targetConfig.labelIds;
    const targetLabelIds = await this.gmailService.convertLabelNamesToIds(
      userId,
      targetLabels,
    );

    const sourceConfig = columnConfigMap[moveDto.sourceColumn];
    const sourceLabels = sourceConfig.labelIds;
    const sourceLabelIds = await this.gmailService.convertLabelNamesToIds(
      userId,
      sourceLabels,
    );

    if (!sourceLabels || !targetLabels) {
      throw new BadRequestException('Invalid column ID');
    }

    const addLabelIds: string[] = [...targetLabelIds];
    const removeLabelIds: string[] = [...sourceLabelIds];

    switch (moveDto.targetColumn) {
      case KanbanColumnId.DONE:
        removeLabelIds.push('UNREAD', 'INBOX');
        break;

      case KanbanColumnId.INBOX:
        addLabelIds.push('INBOX');
        removeLabelIds.push(
          'Kanban/To Do',
          'Kanban/In Progress',
          'Kanban/Done',
          'Kanban/Snoozed',
        );
        break;

      case KanbanColumnId.SNOOZED:
        removeLabelIds.push('INBOX');
        break;
    }

    const uniqueAddLabels = [...new Set(addLabelIds)];
    const uniqueRemoveLabels = [...new Set(removeLabelIds)];

    await this.gmailService.modifyMessage(userId, emailId, {
      addLabelIds: uniqueAddLabels,
      removeLabelIds: uniqueRemoveLabels,
    });

    if (moveDto.targetPosition !== undefined) {
      await this.orderRepository.upsert(
        {
          userId,
          emailId,
          columnId: moveDto.targetColumn,
          order: moveDto.targetPosition,
        },
        ['userId', 'emailId', 'columnId'],
      );

      await this.shiftEmailPositions(
        userId,
        moveDto.targetColumn,
        moveDto.targetPosition,
        emailId,
      );
    } else {
      await this.orderRepository.delete({
        userId,
        emailId,
        columnId: moveDto.sourceColumn,
      });
    }

    return {
      success: true,
      emailId: emailId,
      sourceColumn: moveDto.sourceColumn,
      targetColumn: moveDto.targetColumn,
      message: `Email moved from "${moveDto.sourceColumn}" to "${moveDto.targetColumn}"`,
    };
  }

  async batchMoveEmails(
    userId: number,
    batchDto: BatchMoveEmailDto,
  ): Promise<BatchMoveEmailResponseDto> {
    const results = await Promise.all(
      batchDto.emailIds.map(async (emailId) => {
        try {
          await this.moveEmailToColumn(userId, emailId, {
            sourceColumn: batchDto.sourceColumn,
            targetColumn: batchDto.targetColumn,
          });

          return { emailId, success: true };
        } catch (error) {
          console.log('🚀 ~ KanbanService ~ batchMoveEmails ~ error:', error);
          return { emailId, success: false, error: error.message };
        }
      }),
    );

    const moved = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      success: failed === 0,
      moved,
      failed,
      results,
    };
  }

  async reorderEmails(
    userId: number,
    reorderDto: ReorderEmailsDto,
  ): Promise<ReorderEmailsResponseDto> {
    if (reorderDto.columnId === KanbanColumnId.INBOX) {
      throw new BadRequestException(
        'Inbox emails cannot be reordered manually. ' +
          'They are automatically sorted by date (newest first). ' +
          'To prioritize emails, use the Pin feature or move them to "To Do" column.',
      );
    }

    await Promise.all(
      reorderDto.emails.map(async (emailOrder) => {
        await this.orderRepository.upsert(
          {
            userId,
            emailId: emailOrder.emailId,
            columnId: reorderDto.columnId,
            order: emailOrder.order,
          },
          ['userId', 'emailId', 'columnId'],
        );
      }),
    );

    return {
      success: true,
      message: `Reordered ${reorderDto.emails.length} emails in ${reorderDto.columnId}`,
    };
  }

  private async buildEmailCard(
    userId: number,
    emailId: string,
  ): Promise<EmailCardDto> {
    const message = await this.gmailService.getMessage(userId, emailId);
    const parsed = parseEmailDetail(message);

    const fromHeader = parsed.headers?.from || 'Unknown';
    const fromMatch = fromHeader.match(/^(.*?)\s*<(.+?)>$/);
    const fromName = fromMatch ? fromMatch[1].trim() : fromHeader;
    const fromEmail = fromMatch ? fromMatch[2] : fromHeader;

    return {
      id: parsed.id,
      subject: parsed.headers?.subject || '(No Subject)',
      from: fromEmail,
      fromName: fromName !== fromEmail ? fromName : undefined,
      snippet: parsed.snippet,
      summary: null,
      hasSummary: false,
      summarizedAt: null,
      date: parsed.headers?.date || parsed.internalDate,
      hasAttachments: (parsed.body.attachments?.length || 0) > 0,
      attachmentCount: parsed.body.attachments?.length || 0,
      isUnread: parsed.labelIds?.includes('UNREAD') || false,
      isStarred: parsed.labelIds?.includes('STARRED') || false,
      isImportant: parsed.labelIds?.includes('IMPORTANT') || false,
      labelIds: parsed.labelIds || [],
      threadId: parsed.threadId,
    };
  }

  private buildColumnQueryWithFilters(
    labelIds: string[],
    filters: GetColumnQueryDto,
  ): string {
    const queryParts: string[] = [];

    if (labelIds.includes('INBOX')) {
      queryParts.push('in:inbox');
      queryParts.push('-label:Kanban/To-Do');
      queryParts.push('-label:Kanban/In-Progress');
      queryParts.push('-label:Kanban/Done');
      queryParts.push('-label:Kanban/Snoozed');
    } else {
      const labelQuery = labelIds
        .map((label) => `label:${label.replace(/\s+/g, '-')}`)
        .join(' ');
      queryParts.push(labelQuery);
    }

    if (filters.search) {
      queryParts.push(`(subject:"${filters.search}" OR "${filters.search}")`);
    }

    if (filters.from) {
      queryParts.push(`from:${filters.from}`);
    }

    if (filters.hasAttachments === true) {
      queryParts.push('has:attachment');
    } else if (filters.hasAttachments === false) {
      queryParts.push('-has:attachment');
    }

    if (filters.isUnread === true) {
      queryParts.push('is:unread');
    } else if (filters.isUnread === false) {
      queryParts.push('-is:unread');
    }

    if (filters.isStarred === true) {
      queryParts.push('is:starred');
    } else if (filters.isStarred === false) {
      queryParts.push('-is:starred');
    }

    return queryParts.join(' ');
  }

  private async getEmailPriorities(
    userId: number,
    emailIds: string[],
  ): Promise<Map<string, EmailPriority>> {
    if (emailIds.length === 0) {
      return new Map();
    }

    const priorities = await this.priorityRepository.find({
      where: {
        userId,
        emailId: In(emailIds),
      },
    });

    return new Map(priorities.map((p) => [p.emailId, p]));
  }

  private async getEmailSummaries(
    userId: number,
    emailIds: string[],
  ): Promise<Map<string, EmailSummary>> {
    if (emailIds.length === 0) {
      return new Map();
    }

    const summaries = await this.summaryRepository.find({
      where: {
        userId,
        emailId: In(emailIds),
      },
    });

    return new Map(summaries.map((s) => [s.emailId, s]));
  }

  private async getCustomOrders(
    userId: number,
    columnId: string,
    emailIds: string[],
  ): Promise<Map<string, number>> {
    if (emailIds.length === 0) {
      return new Map();
    }

    const orders = await this.orderRepository.find({
      where: { userId, columnId },
    });

    const orderMap = new Map<string, number>();
    orders.forEach((order) => {
      orderMap.set(order.emailId, order.order);
    });

    return orderMap;
  }

  private async shiftEmailPositions(
    userId: number,
    columnId: string,
    insertPosition: number,
    excludeEmailId: string,
  ): Promise<void> {
    const existingOrders = await this.orderRepository.find({
      where: {
        userId,
        columnId,
      },
      order: {
        order: 'ASC',
      },
    });

    const updates = existingOrders
      .filter(
        (order) =>
          order.emailId !== excludeEmailId && order.order >= insertPosition,
      )
      .map((order) => ({
        ...order,
        order: order.order + 1,
      }));

    if (updates.length > 0) {
      await this.orderRepository.save(updates);
    }
  }
}
