import { OpenRouterService } from './../open-router/open-router.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KanbanColumnDto } from './dto/kanban-column.dto';
import { GetColumnQueryDto } from './dto/get-column.dto';
import { GmailService } from '../gmail/gmail.service';
import { EmailCardDto } from './dto/email-card.dto';
import {
  getHeaderValue,
  parseEmailDetail,
  prepareEmailToSummarize,
} from '../utils/email.util';
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
import { SnoozeEmailDto, SnoozeResponseDto } from './dto/snooze-email.dto';
import { EmailSnooze } from '../email/entities/email-snooze.entity';
import { SnoozeService } from '../snooze/snooze.service';
import {
  PinEmailDto,
  PinResponseDto,
  SetPriorityDto,
} from 'src/kanban/dto/pin-email.dto';
import {
  BatchSummarizeDto,
  BatchSummarizeResponseDto,
  SummarizeEmailDto,
  SummarizeResponseDto,
  SummaryStatsDto,
} from 'src/kanban/dto/summarize-email.dto';
import { EmailSummaryDto } from 'src/mailbox/dto/email-summary.dto';
import { KanbanColumnConfig } from 'src/kanban/entities/kanban-column-config.entity';

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

    @InjectRepository(EmailSnooze)
    private readonly snoozeRepository: Repository<EmailSnooze>,

    @InjectRepository(KanbanColumnConfig)
    private readonly columnConfigRepository: Repository<KanbanColumnConfig>,

    private readonly snoozeService: SnoozeService,

    private readonly OpenRouterService: OpenRouterService,
  ) {}

  async createDefaultColumns(userId: number): Promise<KanbanColumnConfig[]> {
    const defaultColumns = [
      {
        name: 'Inbox',
        gmailLabel: 'INBOX',
        gmailLabelName: 'Inbox',
        order: 0,
      },
      {
        name: 'To Do',
        gmailLabel:
          (await this.gmailService.getLabelIdByName(userId, 'Kanban/To Do')) ??
          '',
        gmailLabelName: 'Kanban/To Do',
        order: 1,
      },
      {
        name: 'In Progress',
        gmailLabel:
          (await this.gmailService.getLabelIdByName(
            userId,
            'Kanban/In Progress',
          )) ?? '',
        gmailLabelName: 'Kanban/In Progress',
        order: 2,
      },
      {
        name: 'Done',
        gmailLabel:
          (await this.gmailService.getLabelIdByName(userId, 'Kanban/Done')) ??
          '',
        gmailLabelName: 'Kanban/Done',
        order: 3,
      },
      {
        name: 'Snoozed',
        gmailLabel:
          (await this.gmailService.getLabelIdByName(
            userId,
            'Kanban/Snoozed',
          )) ?? '',
        gmailLabelName: 'Kanban/Snoozed',
        order: 4,
      },
    ];

    const entities = defaultColumns.map((col) =>
      this.columnConfigRepository.create({ ...col, userId }),
    );

    const savedColumns = await this.columnConfigRepository.save(entities);

    return savedColumns;
  }

  async getUserColumns(userId: number): Promise<{
    columns: {
      [key: number]: {
        id: number;
        name: string;
        labelIds: string[];
        order: number;
        count: number;
      };
    };
  }> {
    const userColumns = await this.columnConfigRepository.find({
      where: { userId, isActive: true },
      order: { order: 'ASC' },
    });

    if (userColumns.length === 0) {
      const defaultColumns = await this.createDefaultColumns(userId);
      return this.formatColumnsResponse(defaultColumns);
    }

    return this.formatColumnsResponse(userColumns);
  }

  private formatColumnsResponse(columns: KanbanColumnConfig[]): {
    columns: {
      [key: number]: {
        id: number;
        name: string;
        labelIds: string[];
        order: number;
        count: number;
      };
    };
  } {
    const formattedColumns: Record<number, any> = {};

    columns.forEach((col) => {
      formattedColumns[col.id] = {
        id: col.id,
        name: col.name,
        labelIds: [col.gmailLabel],
        order: col.order,
        count: 0,
      };
    });

    return { columns: formattedColumns };
  }

  async getKanbanColumn(
    userId: number,
    columnId: number,
    query: GetColumnQueryDto,
  ): Promise<KanbanColumnDto> {
    const columnConfig = await this.columnConfigRepository.findOne({
      where: { id: columnId, userId, isActive: true },
    });

    if (!columnConfig) {
      throw new BadRequestException(`Column ${columnId} not found or inactive`);
    }

    const gmailQuery = this.buildColumnQueryWithFilters(
      [columnConfig.gmailLabelName],
      query,
    );

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

    const filteredCards = cardsWithMetadata.filter((card) => {
      let isValid = true;

      if (query.hasAttachments !== undefined) {
        const hasAttachments = card.hasAttachments;
        isValid = isValid && query.hasAttachments === hasAttachments;
      }

      if (query.isUnread !== undefined) {
        const isUnread = card.labelIds && card.labelIds.includes('UNREAD');
        isValid = isValid && query.isUnread === isUnread;
      }

      return isValid;
    });

    let sortedCards: EmailCardDto[];
    let pinnedCount = 0;

    if (columnConfig.gmailLabel === 'INBOX') {
      const pinned = filteredCards.filter((c) => c.isPinned);
      const regular = filteredCards.filter((c) => !c.isPinned);

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

      sortedCards = filteredCards.sort((a, b) => {
        if (query?.sortBy === 'oldest') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } else if (query?.sortBy === 'newest') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }

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
      id: columnConfig.id,
      name: columnConfig.name,
      labelIds: [columnConfig.gmailLabel],
      count: sortedCards.length,
      emails: sortedCards,
      order: columnConfig.order,
      pagination,
      canReorder: columnConfig.gmailLabel !== 'INBOX',
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

    const targetColumn = await this.columnConfigRepository.findOne({
      where: { id: moveDto.targetColumn, userId },
    });

    if (!targetColumn) {
      throw new BadRequestException(
        `Target column ${moveDto.targetColumn} not found`,
      );
    }

    let sourceColumn: KanbanColumnConfig | null = null;
    if (moveDto.sourceColumn) {
      sourceColumn = await this.columnConfigRepository.findOne({
        where: { id: moveDto.sourceColumn, userId },
      });
    }

    // Update Gmail labels
    const labelsToAdd = [targetColumn.gmailLabel];
    const labelsToRemove = sourceColumn ? [sourceColumn.gmailLabel] : [];

    try {
      await this.gmailService.modifyMessage(userId, emailId, {
        addLabelIds: labelsToAdd,
        removeLabelIds: labelsToRemove,
      });
    } catch (error) {
      console.error('Failed to update Gmail labels:', error);
      throw new BadRequestException('Failed to move email in Gmail');
    }

    await this.orderRepository.delete({
      userId,
      emailId,
    });

    const targetOrder = moveDto.targetPosition ?? 0;

    await this.orderRepository.save({
      userId,
      emailId,
      columnId: moveDto.targetColumn,
      order: targetOrder,
    });

    if (moveDto.targetPosition !== undefined) {
      await this.shiftEmailPositions(
        userId,
        moveDto.targetColumn,
        moveDto.targetPosition,
        emailId,
      );
    }

    if (
      targetColumn.gmailLabel === 'INBOX' ||
      sourceColumn?.gmailLabel === 'INBOX'
    ) {
      const existingPriority = await this.priorityRepository.findOne({
        where: { userId, emailId },
      });

      if (existingPriority) {
        existingPriority.columnId = moveDto.targetColumn;
        await this.priorityRepository.save(existingPriority);
      }
    }

    console.log(`Email moved successfully to column ${moveDto.targetColumn}`);

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
    const column = await this.columnConfigRepository.findOne({
      where: { id: reorderDto.columnId, userId },
    });

    if (!column) {
      throw new BadRequestException(`Column ${reorderDto.columnId} not found`);
    }

    if (column.gmailLabel === 'INBOX') {
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

  async snoozeEmail(
    userId: number,
    emailId: string,
    snoozeDto: SnoozeEmailDto,
  ): Promise<SnoozeResponseDto> {
    // Detect current column from email labels
    const currentColumn = await this.detectCurrentColumnFromEmail(
      userId,
      emailId,
    );

    if (!currentColumn) {
      throw new BadRequestException('Could not determine current email column');
    }

    const email = await this.gmailService.getMessage(userId, emailId);

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    // Find snoozed column
    let snoozedColumn = await this.columnConfigRepository.findOne({
      where: {
        userId,
        gmailLabelName: 'Kanban/Snoozed',
      },
    });

    if (!snoozedColumn) {
      // throw new BadRequestException('Snoozed column not found');
      // create snoozed column if not found
      const existingColumns = await this.columnConfigRepository.find({
        where: { userId },
      });
      const newSnoozedColumn = this.columnConfigRepository.create({
        name: 'Snoozed',
        gmailLabel:
          (await this.gmailService.getLabelIdByName(
            userId,
            'Kanban/Snoozed',
          )) ?? '',
        gmailLabelName: 'Kanban/Snoozed',
        order: existingColumns.length + 1,
        userId,
        isActive: false,
      });
      await this.columnConfigRepository.save(newSnoozedColumn);
      snoozedColumn = newSnoozedColumn;
    }

    const snoozeUntil = this.snoozeService.calculateSnoozeTime(
      snoozeDto.preset,
      snoozeDto.customDate,
    );

    // Move email to snoozed column
    await this.moveEmailToColumn(userId, emailId, {
      sourceColumn: currentColumn.id,
      targetColumn: snoozedColumn.id,
    });

    const snooze = this.snoozeRepository.create({
      userId,
      emailId,
      threadId: email.threadId,
      originalColumn: currentColumn.id,
      snoozeUntil,
      isRestored: false,
    } as EmailSnooze);

    const savedSnooze = await this.snoozeRepository.save(snooze);

    await this.orderRepository.delete({
      userId,
      emailId,
    });

    const description = this.snoozeService.getSnoozeDescription(snoozeUntil);

    return {
      id: savedSnooze.id,
      emailId: savedSnooze.emailId,
      originalColumn: savedSnooze.originalColumn,
      snoozeUntil: savedSnooze.snoozeUntil.toISOString(),
      isRestored: false,
      description,
    };
  }

  async getSnoozedEmails(userId: number): Promise<SnoozeResponseDto[]> {
    const snoozes = await this.snoozeService.findSnoozedEmails(userId);

    const call = snoozes?.map(async (snooze) => {
      const fullMessage = await this.gmailService.getEmailMetadata(
        userId,
        snooze.emailId,
      );

      const { payload, ...rest } = fullMessage;

      const rawHeaders = payload?.headers || [];
      const headers = {
        subject: getHeaderValue(rawHeaders, 'Subject') || '',
        from: (getHeaderValue(rawHeaders, 'From') || '').split('<')[0].trim(),
        to: getHeaderValue(rawHeaders, 'To') || '',
        date: getHeaderValue(rawHeaders, 'Date') || '',
      };

      const isUnread = fullMessage.labelIds?.includes('UNREAD') || false;
      const isStarred = fullMessage.labelIds?.includes('STARRED') || false;
      const isImportant = fullMessage.labelIds?.includes('IMPORTANT') || false;

      return {
        ...rest,
        header: headers,
        isUnread,
        isStarred,
        isImportant,
      } as EmailSummaryDto;
    });

    const detailedEmails = await Promise.all(call || []);

    return snoozes.map((snooze) => ({
      id: snooze.id,
      emailId: snooze.emailId,
      emailInfo: detailedEmails.find((e) => e.id === snooze.emailId)!,
      originalColumn: snooze.originalColumn,
      snoozeUntil: snooze.snoozeUntil.toISOString(),
      isRestored: snooze.isRestored,
      description: this.snoozeService.getSnoozeDescription(snooze.snoozeUntil),
    }));
  }

  async unsnoozeEmail(
    userId: number,
    emailId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    await this.snoozeService.unsnooze(userId, emailId);

    return {
      success: true,
      message: `Email ${emailId} restored from snooze`,
    };
  }

  async pinEmail(
    userId: number,
    emailId: string,
    pinDto: PinEmailDto,
  ): Promise<PinResponseDto> {
    const column = await this.columnConfigRepository.findOne({
      where: { id: pinDto.columnId, userId },
    });

    if (!column) {
      throw new BadRequestException(`Column ${pinDto.columnId} not found`);
    }

    if (column.gmailLabel !== 'INBOX') {
      throw new BadRequestException(
        'Pin feature currently only available for Inbox column',
      );
    }

    const email = await this.gmailService.getMessage(userId, emailId);
    if (!email) {
      throw new NotFoundException('Email not found');
    }

    let pinnedOrder: number;

    if (pinDto.position !== undefined) {
      pinnedOrder = pinDto.position;

      await this.shiftPinnedPositions(
        userId,
        pinDto.columnId,
        pinDto.position,
        emailId,
      );
    } else {
      const maxOrder = await this.priorityRepository
        .createQueryBuilder('priority')
        .where('priority.userId = :userId', { userId })
        .andWhere('priority.columnId = :columnId', {
          columnId: pinDto.columnId,
        })
        .andWhere('priority.isPinned = true')
        .select('MAX(priority.pinnedOrder)', 'maxOrder')
        .getRawOne();

      pinnedOrder = (maxOrder?.maxOrder ?? -1) + 1;
    }

    await this.priorityRepository.upsert(
      {
        userId,
        emailId,
        columnId: pinDto.columnId,
        isPinned: true,
        pinnedOrder,
        priorityLevel: 0,
      },
      ['userId', 'emailId'],
    );

    return {
      emailId,
      isPinned: true,
      pinnedOrder,
      priorityLevel: 0,
    };
  }

  async unpinEmail(
    userId: number,
    emailId: string,
  ): Promise<{ success: boolean }> {
    const priority = await this.priorityRepository.findOne({
      where: {
        userId,
        emailId,
        isPinned: true,
      },
    });

    if (!priority) {
      throw new NotFoundException('Email is not pinned');
    }

    if (priority.priorityLevel === 0) {
      await this.priorityRepository.delete({ id: priority.id });
    } else {
      priority.isPinned = false;
      priority.pinnedOrder = 0;
      await this.priorityRepository.save(priority);
    }

    return { success: true };
  }

  async setPriority(
    userId: number,
    emailId: string,
    priorityDto: SetPriorityDto,
  ): Promise<PinResponseDto> {
    if (priorityDto.priorityLevel < 0 || priorityDto.priorityLevel > 2) {
      throw new BadRequestException('Priority level must be 0, 1, or 2');
    }

    let priority = await this.priorityRepository.findOne({
      where: { userId, emailId },
    });

    if (priority) {
      priority.priorityLevel = priorityDto.priorityLevel;
      await this.priorityRepository.save(priority);
    } else {
      const email = await this.gmailService.getMessage(userId, emailId);
      const columnId = await this.detectColumnFromLabels(
        email.labelIds || [],
        userId,
      );

      priority = await this.priorityRepository.save({
        userId,
        emailId,
        columnId: columnId?.id,
        isPinned: false,
        priorityLevel: priorityDto.priorityLevel,
      });
    }

    return {
      emailId,
      isPinned: priority.isPinned,
      pinnedOrder: priority.pinnedOrder ?? 0,
      priorityLevel: priority.priorityLevel,
    };
  }

  async summarizeEmail(
    userId: number,
    emailId: string,
    options?: SummarizeEmailDto,
  ): Promise<SummarizeResponseDto> {
    if (!options?.forceRegenerate) {
      const existing = await this.summaryRepository.findOne({
        where: { userId, emailId },
      });

      if (existing) {
        return {
          emailId,
          summary: existing.summary,
          fromDatabase: true,
          summarizedAt: existing.updatedAt.toISOString(),
        };
      }
    }

    const message = await this.gmailService.getMessage(userId, emailId);

    if (!message) {
      throw new NotFoundException('Email not found');
    }

    const parsedEmail = parseEmailDetail(message);
    const aiInput = prepareEmailToSummarize(parsedEmail);
    console.log(aiInput);

    const summary = await this.OpenRouterService.summarizeEmail(aiInput);

    await this.summaryRepository.upsert(
      {
        userId,
        emailId,
        summary,
      },
      ['userId', 'emailId'],
    );

    return {
      emailId,
      summary,
      fromDatabase: false,
      summarizedAt: new Date().toISOString(),
    };
  }

  async batchSummarizeEmails(
    userId: number,
    batchDto: BatchSummarizeDto,
  ): Promise<BatchSummarizeResponseDto> {
    const results = await Promise.all(
      batchDto.emailIds.map(async (emailId) => {
        try {
          const result = await this.summarizeEmail(userId, emailId);
          return {
            emailId,
            success: true,
            summary: result.summary,
          };
        } catch (error) {
          return {
            emailId,
            success: false,
            error: error.message,
          };
        }
      }),
    );

    const success = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return { success, failed, results };
  }

  async getSummaryStats(userId: number): Promise<SummaryStatsDto> {
    const summaries = await this.summaryRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });

    return {
      totalSummaries: summaries.length,
      oldestSummary: summaries[0]?.createdAt.toISOString() || null,
      newestSummary:
        summaries[summaries.length - 1]?.createdAt.toISOString() || null,
    };
  }

  async deleteSummary(
    userId: number,
    emailId: string,
  ): Promise<{ success: boolean }> {
    await this.summaryRepository.delete({ userId, emailId });
    return { success: true };
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
    columnId: number,
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
    columnId: number,
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

  private async detectColumnFromLabels(
    labelIds: string[],
    userId: number,
  ): Promise<KanbanColumnConfig | null> {
    // Find column config that matches any of the email's labels
    const matchingColumn = await this.columnConfigRepository.findOne({
      where: {
        userId,
        gmailLabel: In(labelIds),
      },
    });

    return matchingColumn;
  }

  private async detectCurrentColumnFromEmail(
    userId: number,
    emailId: string,
  ): Promise<KanbanColumnConfig | null> {
    // Get email details from Gmail
    const message = await this.gmailService.getMessage(userId, emailId);
    const labelIds = message.labelIds || [];

    // Find matching column
    return this.detectColumnFromLabels(labelIds, userId);
  }

  private async shiftPinnedPositions(
    userId: number,
    columnId: number,
    insertPosition: number,
    excludeEmailId: string,
  ): Promise<void> {
    const existingPinned = await this.priorityRepository.find({
      where: {
        userId,
        columnId,
        isPinned: true,
      },
      order: {
        pinnedOrder: 'ASC',
      },
    });

    const updates = existingPinned
      .filter(
        (p) => p.emailId !== excludeEmailId && p.pinnedOrder >= insertPosition,
      )
      .map((p) => ({
        ...p,
        pinnedOrder: p.pinnedOrder + 1,
      }));

    if (updates.length > 0) {
      await this.priorityRepository.save(updates);
    }
  }
}
