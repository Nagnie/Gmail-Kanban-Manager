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
import { In, Not, Repository } from 'typeorm';
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
import { CreateColumnDto } from 'src/kanban/dto/create-column.dto';
import {
  AvailableLabelDto,
  ColumnResponseDto,
  ReorderColumnsDto,
} from 'src/kanban/dto/column-management.dto';
import { formatColumnsResponse, mapToColumnResponse } from 'src/kanban/mappers';
import { UpdateColumnDto } from 'src/kanban/dto/update-column.dto';
import { gmail_v1 } from 'googleapis';

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
    const [toDoLabel, inProgressLabel, doneLabel, snoozedLabel] =
      await Promise.all([
        this.gmailService.getOrCreateLabel(userId, 'Kanban/To Do'),
        this.gmailService.getOrCreateLabel(userId, 'Kanban/In Progress'),
        this.gmailService.getOrCreateLabel(userId, 'Kanban/Done'),
        this.gmailService.getOrCreateLabel(userId, 'Kanban/Snoozed'),
      ]);

    const defaultColumns = [
      {
        name: 'Inbox',
        gmailLabel: 'INBOX',
        gmailLabelName: 'Inbox',
        hasEmailSync: true,
        order: 0,
      },
      {
        name: 'To Do',
        gmailLabel: toDoLabel ?? '',
        gmailLabelName: 'Kanban/To Do',
        hasEmailSync: true,
        order: 1,
      },
      {
        name: 'In Progress',
        gmailLabel: inProgressLabel ?? '',
        gmailLabelName: 'Kanban/In Progress',
        hasEmailSync: true,
        order: 2,
      },
      {
        name: 'Done',
        gmailLabel: doneLabel ?? '',
        gmailLabelName: 'Kanban/Done',
        hasEmailSync: true,
        order: 3,
      },
      {
        name: 'Snoozed',
        gmailLabel: snoozedLabel ?? '',
        gmailLabelName: 'Kanban/Snoozed',
        hasEmailSync: true,
        isActive: false,
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
      return formatColumnsResponse(defaultColumns);
    }

    return formatColumnsResponse(userColumns);
  }

  async getAvailableLabels(userId: number): Promise<AvailableLabelDto[]> {
    try {
      const labels = await this.gmailService.listLabels_v2(userId);

      const userColumns = await this.columnConfigRepository.find({
        where: { userId, isActive: true },
      });
      const assignedLabelIds = userColumns.map((column) => column.gmailLabel);

      const formattedLabels: AvailableLabelDto[] = await Promise.all(
        labels.map(async (label) => ({
          id: label.id!,
          name: label.name!,
          type: this.getLabelType(label),
          isKanbanLabel: this.isKanbanLabel(label.name!),
          isAssigned: assignedLabelIds.includes(label.id!),
          emailCount: await this.getEmailCountForLabel(userId, label.name!),
        })),
      );

      // remove inbox, draft, spam, sent, trash, categories
      const filteredLabels = formattedLabels.filter(
        (label) =>
          ![
            'INBOX',
            'DRAFT',
            'SPAM',
            'SENT',
            'TRASH',
            'CATEGORY_FORUMS',
            'CATEGORY_PERSONAL',
            'CATEGORY_PROMOTIONS',
            'CATEGORY_SOCIAL',
            'CATEGORY_UPDATES',
          ].includes(label.id) && label.name !== 'Kanban/Snoozed',
      );

      return filteredLabels.sort((a, b) => {
        // Sort:  system first, then user labels, then kanban labels
        const typeOrder = { system: 0, user: 1, kanban: 2 };
        return (
          typeOrder[a.type] - typeOrder[b.type] || a.name.localeCompare(b.name)
        );
      });
    } catch (error) {
      console.error('Failed to get available labels:', error);
      throw new BadRequestException('Failed to load available Gmail labels');
    }
  }

  private getLabelType(
    label: gmail_v1.Schema$Label,
  ): 'system' | 'user' | 'kanban' {
    if (label.type === 'system') return 'system';
    if (this.isKanbanLabel(label.name!)) return 'kanban';
    return 'user';
  }

  private isKanbanLabel(labelName: string | undefined): boolean {
    return labelName?.startsWith('Kanban/') || false;
  }

  async createColumn(
    userId: number,
    createColumnDto: CreateColumnDto,
  ): Promise<ColumnResponseDto> {
    // Validate column name uniqueness
    const existingColumn = await this.columnConfigRepository.findOne({
      where: {
        userId,
        name: createColumnDto.name,
        isActive: true,
      },
    });

    if (existingColumn) {
      throw new BadRequestException(
        `Column with name "${createColumnDto.name}" already exists`,
      );
    }

    let gmailLabelId: string | null = null;
    let gmailLabelName: string | null = null;
    let hasEmailSync: boolean = false;

    // Handle label assignment
    if (createColumnDto.labelOption && createColumnDto.labelOption !== 'none') {
      try {
        if (createColumnDto.labelOption === 'existing') {
          gmailLabelId = createColumnDto.existingLabelId!;
          gmailLabelName = createColumnDto.existingLabelName!;

          // Verify label exists and user has access
          const userLabels = await this.gmailService.listLabels_v2(userId);
          const labelExists = userLabels.some(
            (label) => label.id === gmailLabelId,
          );

          if (!labelExists) {
            throw new BadRequestException(
              'Selected Gmail label does not exist or is not accessible',
            );
          }

          const existingColumnWithLabel =
            await this.columnConfigRepository.findOne({
              where: {
                userId,
                gmailLabel: createColumnDto.existingLabelId!,
                isActive: true,
              },
            });

          if (existingColumnWithLabel) {
            throw new BadRequestException(
              `Label "${createColumnDto.existingLabelName}" is already used by column "${existingColumnWithLabel.name}"`,
            );
          }

          hasEmailSync = true;
        } else if (createColumnDto.labelOption === 'new') {
          // Create new label
          const labelName =
            createColumnDto.newLabelName || `Kanban/${createColumnDto.name}`;
          gmailLabelName = labelName;

          // Check if label already exists
          if (
            (await this.gmailService.labelExists(userId, labelName)) &&
            !labelName.startsWith('Kanban/')
          ) {
            throw new BadRequestException(
              `Gmail label "${labelName}" already exists`,
            );
          }

          gmailLabelId = (await this.gmailService.getOrCreateLabel(
            userId,
            labelName,
          )) as string;

          console.log(
            `Created new Gmail label: ${labelName} (${gmailLabelId})`,
          );

          hasEmailSync = true;
        }
      } catch (error) {
        console.error('Failed to setup Gmail label:', error);
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Failed to setup Gmail label');
      }
    } else {
      console.log(`Creating column without Gmail label mapping`);
    }

    // Get max order
    const maxOrder = await this.columnConfigRepository
      .createQueryBuilder('column')
      .select('MAX(column.order)', 'maxOrder')
      .where('column.userId = :userId AND column.isActive = :isActive', {
        userId,
        isActive: true,
      })
      .getRawOne();

    // Create column
    const column = this.columnConfigRepository.create({
      userId,
      name: createColumnDto.name,
      gmailLabel: gmailLabelId,
      gmailLabelName: gmailLabelName,
      order: (maxOrder?.maxOrder || 0) + 1,
      hasEmailSync: hasEmailSync,
    });

    const savedColumn = await this.columnConfigRepository.save(column);

    console.log(`Column created successfully: `, {
      id: savedColumn.id,
      name: savedColumn.name,
      hasEmailSync: savedColumn.hasEmailSync,
    });

    return mapToColumnResponse(savedColumn);
  }

  private async validateGmailLabel(
    userId: number,
    labelId: string,
  ): Promise<boolean> {
    try {
      const userLabels = await this.gmailService.listLabels_v2(userId);
      return userLabels.some((label) => label.id === labelId);
    } catch (error) {
      console.error('Failed to validate Gmail label:', error);
      return false;
    }
  }

  private async convertColumnToLocalOnly(
    userId: number,
    columnConfig: KanbanColumnConfig,
  ): Promise<void> {
    try {
      console.log(
        `Converting column "${columnConfig.name}" to local-only mode`,
      );

      // Update column config
      columnConfig.hasEmailSync = false;
      columnConfig.gmailLabel = null;
      columnConfig.gmailLabelName = null;

      await this.columnConfigRepository.save(columnConfig);

      console.log(
        `Column "${columnConfig.name}" converted to local-only successfully`,
      );
    } catch (error) {
      console.error('Failed to convert column to local-only:', error);
    }
  }

  async updateColumn(
    userId: number,
    columnId: number,
    updateColumnDto: UpdateColumnDto,
  ): Promise<ColumnResponseDto> {
    const column = await this.columnConfigRepository.findOne({
      where: { id: columnId, userId, isActive: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    // Track original sync status for migration logic
    const originalHasEmailSync = column.hasEmailSync;

    // Update basic fields
    if (updateColumnDto.name && updateColumnDto.name !== column.name) {
      // Check name uniqueness
      const existingColumn = await this.columnConfigRepository.findOne({
        where: {
          userId,
          name: updateColumnDto.name,
          isActive: true,
          id: Not(columnId),
        },
      });

      if (existingColumn) {
        throw new BadRequestException(
          `Column with name "${updateColumnDto.name}" already exists`,
        );
      }

      column.name = updateColumnDto.name;
    }

    // Handle label changes
    if (updateColumnDto.labelOption) {
      if (updateColumnDto.labelOption === 'none') {
        // Remove label mapping
        console.log(
          `Removing Gmail label mapping from column "${column.name}"`,
        );
        column.gmailLabel = null;
        column.gmailLabelName = null;
        column.hasEmailSync = false;
      } else {
        // Set or update label mapping
        let newGmailLabelId: string;
        let newGmailLabelName: string;

        if (updateColumnDto.labelOption === 'existing') {
          newGmailLabelId = updateColumnDto.existingLabelId!;
          newGmailLabelName = updateColumnDto.existingLabelName!;

          // Verify label exists
          const userLabels = await this.gmailService.listLabels_v2(userId);
          const labelExists = userLabels.some(
            (label) => label.id === newGmailLabelId,
          );

          if (!labelExists) {
            throw new BadRequestException(
              'Selected Gmail label does not exist',
            );
          }

          // Check if label is already used by another column
          const existingColumnWithLabel =
            await this.columnConfigRepository.findOne({
              where: {
                userId,
                gmailLabel: newGmailLabelId,
                isActive: true,
                id: Not(columnId),
              },
            });

          if (existingColumnWithLabel) {
            throw new BadRequestException(
              `Label "${newGmailLabelName}" is already used by column "${existingColumnWithLabel.name}"`,
            );
          }
        } else {
          // Create new label
          const labelName =
            updateColumnDto.newLabelName ||
            `Kanban/${updateColumnDto.name || column.name}`;
          newGmailLabelName = labelName;

          if (
            (await this.gmailService.labelExists(userId, labelName)) &&
            !labelName.startsWith('Kanban/')
          ) {
            throw new BadRequestException(
              `Gmail label "${labelName}" already exists`,
            );
          }

          newGmailLabelId = (await this.gmailService.getOrCreateLabel(
            userId,
            labelName,
          )) as string;
          console.log(
            `Created new Gmail label: ${labelName} (${newGmailLabelId})`,
          );
        }

        // // Update label references
        // if (column.gmailLabel !== newGmailLabelId) {
        //   column.gmailLabel = newGmailLabelId;
        //   column.gmailLabelName = newGmailLabelName;
        //   column.hasEmailSync = true;
        //   console.log(
        //     `Updated Gmail label mapping: ${column.gmailLabel} → ${newGmailLabelId}`,
        //   );
        // }
        // Update label references
        column.gmailLabel = newGmailLabelId;
        column.gmailLabelName = newGmailLabelName;
        column.hasEmailSync = true;

        console.log(`Updated Gmail label mapping for column "${column.name}"`);
      }
    }

    // ONLY SYNC WHEN TRANSITIONING FROM NONE TO GMAIL LABEL
    if (!originalHasEmailSync && column.hasEmailSync && column.gmailLabel) {
      console.log(
        `Syncing local emails to Gmail label for column "${column.name}" (first-time mapping)`,
      );
      await this.syncLocalEmailsToGmail(userId, columnId, column.gmailLabel);
    }

    const updatedColumn = await this.columnConfigRepository.save(column);
    console.log(`Column updated successfully`);

    return mapToColumnResponse(updatedColumn);
  }

  private async syncLocalEmailsToGmail(
    userId: number,
    columnId: number,
    gmailLabelId: string,
  ): Promise<void> {
    try {
      // Get all emails tracked locally for this column
      const localEmails = await this.orderRepository.find({
        where: { userId, columnId },
        order: { order: 'ASC' },
      });

      if (localEmails.length === 0) {
        console.log(`No local emails to sync for column ${columnId}`);
        return;
      }

      console.log(
        `Syncing ${localEmails.length} emails to Gmail label ${gmailLabelId}`,
      );

      // Apply Gmail label to all emails
      const batchResults = await Promise.allSettled(
        localEmails.map(async (emailOrder) => {
          try {
            await this.gmailService.modifyMessage(userId, emailOrder.emailId, {
              addLabelIds: [gmailLabelId],
              removeLabelIds: [], // 👈 Don't remove any labels, just add new one
            });

            return { emailId: emailOrder.emailId, success: true };
          } catch (error) {
            console.error(
              `Failed to sync email ${emailOrder.emailId} to Gmail:`,
              error,
            );
            return { emailId: emailOrder.emailId, success: false, error };
          }
        }),
      );

      const successful = batchResults.filter(
        (result) => result.status === 'fulfilled' && result.value.success,
      ).length;

      const failed = batchResults.length - successful;

      console.log(
        `Gmail sync completed: ${successful} success, ${failed} failed`,
      );
    } catch (error) {
      console.error('Failed to sync local emails to Gmail:', error);
      throw new BadRequestException('Failed to sync emails to Gmail label');
    }
  }

  async deleteColumn(
    userId: number,
    columnId: number,
  ): Promise<{ success: boolean }> {
    const column = await this.columnConfigRepository.findOne({
      where: { id: columnId, userId, isActive: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    // Check if it's the last active column
    const activeColumnsCount = await this.columnConfigRepository.count({
      where: { userId, isActive: true },
    });

    if (activeColumnsCount <= 1) {
      throw new BadRequestException(
        'Cannot delete the last column.  You must have at least one active column.',
      );
    }

    // Check if column has emails
    // if (column.hasEmailSync && column.gmailLabel) {
    //   const emailCount = await this.getEmailCountForLabel(
    //     userId,
    //     column.gmailLabel,
    //   );
    //   if (emailCount > 0) {
    //     throw new BadRequestException(
    //       `Cannot delete column "${column.name}" because it contains ${emailCount} emails.  Please move or delete the emails first.`,
    //     );
    //   }
    // }

    // Soft delete
    column.isActive = false;
    await this.columnConfigRepository.save(column);

    // Clean up related records
    await this.orderRepository.delete({ userId, columnId });

    console.log(`Column deleted successfully`);
    return { success: true };
  }

  private async getEmailCountForLabel(
    userId: number,
    labelName: string,
  ): Promise<number> {
    try {
      const response = await this.gmailService.listMessages(
        userId,
        `label:${labelName}`,
        undefined,
        1,
      );
      return response.resultSizeEstimate || 0;
    } catch (error) {
      console.error(`Failed to get email count for label ${labelName}:`, error);
      return 0;
    }
  }

  async reorderColumns(
    userId: number,
    reorderColumnsDto: ReorderColumnsDto,
  ): Promise<{ success: boolean }> {
    // Validate all columns belong to user
    const columnIds = reorderColumnsDto.columns.map((c) => c.id);
    const userColumns = await this.columnConfigRepository.find({
      where: { id: In(columnIds), userId, isActive: true },
    });

    if (userColumns.length !== columnIds.length) {
      throw new BadRequestException(
        'One or more columns not found or do not belong to user',
      );
    }

    // Update orders
    const updates = reorderColumnsDto.columns.map((columnOrder) => ({
      id: columnOrder.id,
      order: columnOrder.order,
      userId,
    }));

    await this.columnConfigRepository.save(updates);

    console.log(`Columns reordered successfully`);
    return { success: true };
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

    // If column doesn't sync with Gmail, return local tracking
    if (!columnConfig.hasEmailSync || !columnConfig.gmailLabel) {
      console.log(
        `Column "${columnConfig.name}" has no Gmail sync - loading from local tracking`,
      );

      return this.getLocalColumnData(userId, columnConfig, query);
    }

    // VALIDATE GMAIL LABEL STILL EXISTS
    try {
      const isLabelValid = await this.validateGmailLabel(
        userId,
        columnConfig.gmailLabel,
      );

      if (!isLabelValid) {
        console.log(
          `Gmail label "${columnConfig.gmailLabel}" no longer exists - converting column to local-only`,
        );

        // Auto-convert to local tracking
        await this.convertColumnToLocalOnly(userId, columnConfig);

        // Return local data with warning
        const localData = await this.getLocalColumnData(
          userId,
          columnConfig,
          query,
        );
        return {
          ...localData,
        };
      }
    } catch (error) {
      console.error(
        `Failed to validate Gmail label for column ${columnId}:`,
        error,
      );

      // If Gmail validation fails, fallback to local tracking
      console.log(
        `Gmail access issue - falling back to local tracking for column "${columnConfig.name}"`,
      );

      const localData = await this.getLocalColumnData(
        userId,
        columnConfig,
        query,
      );
      return {
        ...localData,
      };
    }

    const gmailQuery = this.buildColumnQueryWithFilters(
      [columnConfig.gmailLabelName!],
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

  private async getLocalColumnData(
    userId: number,
    columnConfig: KanbanColumnConfig,
    query: GetColumnQueryDto,
  ): Promise<KanbanColumnDto> {
    const limit = query.limit || 20;
    let offset = 0;

    // Parse pageToken as offset
    if (query.pageToken) {
      try {
        offset = parseInt(query.pageToken);
      } catch (error) {
        console.log('🚀 ~ KanbanService ~ getLocalColumnData ~ error:', error);
        offset = 0;
      }
    }

    // Get total count for pagination
    const totalCount = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.userId = :userId AND order.columnId = :columnId', {
        userId,
        columnId: columnConfig.id,
      })
      .getCount();

    // Get paginated email IDs with ordering
    const orderRecords = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.userId = :userId AND order.columnId = :columnId', {
        userId,
        columnId: columnConfig.id,
      })
      .orderBy('order.order', 'ASC')
      .addOrderBy('order.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();

    if (orderRecords.length === 0) {
      return {
        id: columnConfig.id,
        name: columnConfig.name,
        labelIds: [],
        count: 0,
        emails: [],
        order: columnConfig.order,
        pagination: {
          nextPageToken: undefined,
          estimatedTotal: totalCount,
          hasMore: false,
        },
        canReorder: true,
        pinnedCount: 0,
      };
    }

    const emailIds = orderRecords.map((record) => record.emailId);

    // Fetch email details from Gmail
    const emailCards = await Promise.all(
      emailIds.map(async (emailId) => {
        try {
          return await this.buildEmailCard(userId, emailId);
        } catch (error) {
          console.error(`Failed to build email card for ${emailId}:`, error);
          return null;
        }
      }),
    );

    // Filter out failed cards
    const validCards = emailCards.filter(
      (card): card is EmailCardDto => card !== null,
    );

    // Get metadata
    const priorities = await this.getEmailPriorities(userId, emailIds);
    const summaries = await this.getEmailSummaries(userId, emailIds);

    // Add metadata to cards
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

    // Apply local query filters
    const filteredCards = this.applyLocalQueryFilters(cardsWithMetadata, query);

    // Apply sorting
    const customOrders = await this.getCustomOrders(
      userId,
      columnConfig.id,
      emailIds,
    );

    const sortedCards = filteredCards.sort((a, b) => {
      // Apply sortBy query parameter first
      if (query?.sortBy === 'oldest') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (query?.sortBy === 'newest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      // Then apply custom order
      const orderA = customOrders.get(a.id);
      const orderB = customOrders.get(b.id);

      if (orderA !== undefined && orderB !== undefined) {
        return orderA - orderB;
      }
      if (orderA !== undefined) return -1;
      if (orderB !== undefined) return 1;

      // Default:  newest first
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Generate pagination
    const nextOffset = offset + limit;
    const hasMore = nextOffset < totalCount;
    const nextPageToken = hasMore ? nextOffset.toString() : undefined;

    return {
      id: columnConfig.id,
      name: columnConfig.name,
      labelIds: [],
      count: sortedCards.length,
      emails: sortedCards,
      order: columnConfig.order,
      pagination: {
        nextPageToken,
        estimatedTotal: totalCount,
        hasMore,
      },
      canReorder: true,
      pinnedCount: 0, // Non-synced columns don't support pinning
    };
  }

  private applyLocalQueryFilters(
    cards: EmailCardDto[],
    query: GetColumnQueryDto,
  ): EmailCardDto[] {
    let filtered = [...cards];

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filtered = filtered.filter(
        (card) =>
          card.subject.toLowerCase().includes(searchTerm) ||
          card.from.toLowerCase().includes(searchTerm) ||
          card.snippet.toLowerCase().includes(searchTerm),
      );
    }

    if (query.from) {
      filtered = filtered.filter((card) =>
        card.from.toLowerCase().includes(query.from!.toLowerCase()),
      );
    }

    if (query.hasAttachments !== undefined) {
      filtered = filtered.filter(
        (card) => card.hasAttachments === query.hasAttachments,
      );
    }

    if (query.isUnread !== undefined) {
      filtered = filtered.filter((card) => card.isUnread === query.isUnread);
    }

    if (query.isStarred !== undefined) {
      filtered = filtered.filter((card) => card.isStarred === query.isStarred);
    }

    return filtered;
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

    // VALIDATE TARGET COLUMN GMAIL LABEL (if synced)
    if (targetColumn.hasEmailSync && targetColumn.gmailLabel) {
      const isTargetLabelValid = await this.validateGmailLabel(
        userId,
        targetColumn.gmailLabel,
      );

      if (!isTargetLabelValid) {
        console.log(
          `Target column Gmail label deleted - converting to local-only`,
        );
        await this.convertColumnToLocalOnly(userId, targetColumn);

        // Continue with local-only move
        return this.moveEmailToLocalColumn(userId, emailId, moveDto);
      }
    }

    let sourceColumn: KanbanColumnConfig | null = null;
    if (moveDto.sourceColumn) {
      sourceColumn = await this.columnConfigRepository.findOne({
        where: { id: moveDto.sourceColumn, userId },
      });
    }

    // Update Gmail labels
    // const labelsToAdd = [targetColumn.gmailLabel];
    // const labelsToRemove = sourceColumn ? [sourceColumn.gmailLabel] : [];

    // Determine Gmail label operations based on column sync status
    const labelsToAdd: string[] = [];
    const labelsToRemove: string[] = [];

    if (targetColumn.hasEmailSync && targetColumn.gmailLabel) {
      // Target column has Gmail sync - add its label
      labelsToAdd.push(targetColumn.gmailLabel);
      console.log(
        `Target column "${targetColumn.name}" synced - will add label: ${targetColumn.gmailLabel}`,
      );
    } else {
      console.log(
        `Target column "${targetColumn.name}" not synced - no labels to add`,
      );
    }

    if (sourceColumn) {
      if (sourceColumn.hasEmailSync && sourceColumn.gmailLabel) {
        // Source column has Gmail sync - remove its label
        labelsToRemove.push(sourceColumn.gmailLabel);
        console.log(
          `Source column "${sourceColumn.name}" synced - will remove label: ${sourceColumn.gmailLabel}`,
        );
      } else {
        console.log(
          `Source column "${sourceColumn.name}" not synced - no labels to remove`,
        );
      }
    } else {
      // No source column specified - try to detect from email labels
      console.log(`No source column specified - detecting from email labels`);
      const detectedSource = await this.detectCurrentColumnFromEmail(
        userId,
        emailId,
      );

      if (
        detectedSource &&
        detectedSource.hasEmailSync &&
        detectedSource.gmailLabel
      ) {
        labelsToRemove.push(detectedSource.gmailLabel);
        console.log(
          `Detected source column "${detectedSource.name}" - will remove label: ${detectedSource.gmailLabel}`,
        );
      }
    }

    // Apply Gmail label changes (only if needed)
    if (labelsToAdd.length > 0 || labelsToRemove.length > 0) {
      try {
        await this.gmailService.modifyMessage(userId, emailId, {
          addLabelIds: labelsToAdd,
          removeLabelIds: labelsToRemove,
        });

        console.log(`Gmail labels updated: `, {
          added: labelsToAdd,
          removed: labelsToRemove,
        });
      } catch (error) {
        console.error('Failed to update Gmail labels:', error);
        throw new BadRequestException('Failed to update email labels in Gmail');
      }
    } else {
      console.log(
        `No Gmail label changes needed - both columns are non-synced or same sync status`,
      );
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

  private async moveEmailToLocalColumn(
    userId: number,
    emailId: string,
    moveDto: MoveEmailDto,
  ): Promise<MoveEmailResponseDto> {
    console.log(
      `Moving email ${emailId} to local-only column ${moveDto.targetColumn}`,
    );

    // Clean up old order records
    await this.orderRepository.delete({ userId, emailId });

    // Create new order record
    const targetOrder = moveDto.targetPosition ?? 0;
    await this.orderRepository.save({
      userId,
      emailId,
      columnId: moveDto.targetColumn,
      order: targetOrder,
    });

    return {
      success: true,
      emailId: emailId,
      sourceColumn: moveDto.sourceColumn,
      targetColumn: moveDto.targetColumn,
      message: 'Email moved to local-only column',
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
    try {
      // Get email details from Gmail
      const message = await this.gmailService.getMessage(userId, emailId);
      const labelIds = message.labelIds || [];

      if (labelIds.length === 0) {
        return null;
      }

      // Find column that matches any of the email's labels
      const matchingColumn = await this.columnConfigRepository.findOne({
        where: {
          userId,
          gmailLabel: In(labelIds),
          isActive: true,
          hasEmailSync: true,
        },
      });

      return matchingColumn;
    } catch (error) {
      console.error('Failed to detect current column from email:', error);
      return null;
    }
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
