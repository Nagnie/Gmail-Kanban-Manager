import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GmailService } from 'src/gmail/gmail.service';
import { In, Repository } from 'typeorm';
import { Email } from '../entities/email.entity';
import { gmail_v1 } from 'googleapis';
import { EmailSyncEvent } from '../events/email_sync.event';
import { EmailFullSyncEvent } from '../events/email_full_sync.event';
import { EmailEmbeddingEvent } from '../events/email_embedding.event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OpenRouterService } from 'src/open-router/open-router.service';

@Injectable()
export class EmailSynceService {
  private readonly logger = new Logger(EmailSynceService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectRepository(Email)
    private readonly emailRepository: Repository<Email>,
    private readonly gmailService: GmailService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  public async processAndSaveBatch(
    userId: number,
    messages: gmail_v1.Schema$Message[],
    gmailClient: any,
  ): Promise<string[]> {
    if (messages.length === 0) {
      this.logger.log(`[processAndSaveBatch] No messages to process for user ${userId}`);
      return [];
    }
    this.logger.log(
      `[processAndSaveBatch] Processing ${messages.length} messages for user ${userId}...`,
    );
    this.logger.debug(
      `[processAndSaveBatch] Full messages array: ${JSON.stringify(messages.map((m) => ({ id: m.id, threadId: m.threadId })))}`,
    );

    try {
      const messageIds = messages.map((m) => m.id);
      this.logger.log(
        `[processAndSaveBatch] Message IDs to check (first 3): ${messageIds.slice(0, 3)}`,
      );

      const existingIds = await this.emailRepository.find({
        where: { id: In(messageIds), userId },
        select: ['id'],
      });
      this.logger.log(
        `[processAndSaveBatch] Existing IDs in DB (first 3): ${existingIds.map((e) => e.id).slice(0, 3)}`,
      );

      const existingIdSet = new Set(existingIds.map((e) => e.id));
      this.logger.debug(`[processAndSaveBatch] existingIdSet size: ${existingIdSet.size}`);
      this.logger.debug(`[processAndSaveBatch] existingIdSet: ${JSON.stringify(Array.from(existingIdSet))}`);

      const messagesToFetch = messages.filter((m) => {
        const hasId = existingIdSet.has(m.id || '');
        if (!hasId && messages.indexOf(m) < 3) {
          // Log first 3 messages that are NOT in existingIdSet
          this.logger.debug(
            `[processAndSaveBatch] Message ID ${m.id} NOT in existingIdSet, will fetch`,
          );
        }
        return !hasId;
      });

      this.logger.log(
        `[processAndSaveBatch] User ${userId}: ${existingIdSet.size} already exist, ${messagesToFetch.length} new to fetch`,
      );

      if (messagesToFetch.length === 0) {
        this.logger.log(`[processAndSaveBatch] All messages already exist for user ${userId}`);
        return [];
      }

      const fetchedEmails = await Promise.all(
        messagesToFetch.map(async (msg) => {
          try {
            const detail = await gmailClient.users.messages.get({
              format: 'metadata',
              id: msg.id!,
              metadataHeaders: ['Subject', 'From', 'Date'],
              userId: 'me',
            });

            const headers: any[] = detail.data.payload?.headers ?? [];
            return {
              id: msg.id!,
              threadId: msg.threadId!,
              snippet: detail.data.snippet ?? '',
              internalDate: detail.data.internalDate ?? '',
              subject: this.getHeader(headers ?? [], 'Subject'),
              sender: this.getHeader(headers ?? [], 'From'),
              userId: userId,
            };
          } catch (e) {
            this.logger.error(`[processAndSaveBatch] Failed to fetch msg ${msg.id}`, e);
            return null;
          }
        }),
      );

      const validEmails = fetchedEmails.filter((e) => e !== null);
      this.logger.log(
        `[processAndSaveBatch] User ${userId}: fetched ${validEmails.length}/${messagesToFetch.length} valid emails`,
      );
      if (validEmails.length > 0) {
        await this.emailRepository.save(validEmails);
        this.logger.log(`[processAndSaveBatch] Saved ${validEmails.length} emails for user ${userId}`);
        return validEmails.map((email) => email.id);
      }

      this.logger.log(`[processAndSaveBatch] No new emails saved for user ${userId}`);
      return [];
    } catch (error) {
      this.logger.error(`[processAndSaveBatch] Error processing batch for user ${userId}`, error);
      return [];
    }
  }

  async syncEmailsForUser(userId: number) {
    const gmail = await this.gmailService.getAuthenticatedGmailClient(userId);

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,
    });

    const messages = listRes.data.messages || [];
    const nextPageToken = listRes.data.nextPageToken;

    // Check if user has any emails in DB already
    const emailCount = await this.emailRepository.countBy({ userId });
    this.logger.log(
      `[syncEmailsForUser] User ${userId}: ${emailCount} emails already in database`,
    );
    const isFirstSync = emailCount === 0;

    // Emit appropriate event based on first sync or not
    if (messages.length > 0) {
      if (isFirstSync) {
        // First sync: full sync
        console.log(
          `First sync detected for user ${userId}. Triggering full background sync for ${messages.length} emails...`,
        );
        this.eventEmitter.emit(
          'email.full-sync',
          new EmailFullSyncEvent(userId, nextPageToken ?? undefined, 0),
        );
      } else {
        // Incremental sync: sync new/deleted emails
        console.log(
          `Incremental sync for user ${userId}. Triggering background sync for ${messages.length} emails...`,
        );
        this.eventEmitter.emit(
          'email.sync',
          new EmailSyncEvent(userId, nextPageToken ?? undefined, 0),
        );
      }
    }

    // Return immediately without waiting for sync
    return { success: true, message: 'Sync in progress' };
  }

  private getHeader(headers: any[], name: string): string {
    return headers.find((h) => h.name === name)?.value || '';
  }

  private prepareTextForEmbedding(email: any): string {
    return `
        Subject: ${email.subject}
        From: ${email.sender}
        Content: ${email.summary || email.snippet || ''}
    `.trim();
  }

  async syncFirstBatch(userId: number): Promise<string[]> {
    const gmail = await this.gmailService.getAuthenticatedGmailClient(userId);

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 100,
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) return [];

    const nextPageToken = listRes.data.nextPageToken;

    // Process và save batch
    const emailIds = await this.processAndSaveBatch(userId, messages, gmail);
    this.logger.log(
      `[syncFirstBatch] User ${userId}: saved ${emailIds.length} emails, nextPageToken: ${!!nextPageToken}`,
    );

    // Trigger embedding generation
    if (emailIds.length > 0) {
      this.logger.log(
        `[syncFirstBatch] Triggering background embedding generation for ${emailIds.length} emails...`,
      );
      this.eventEmitter.emit(
        'email.embedding',
        new EmailEmbeddingEvent(userId, emailIds, 1),
      );
    }

    // Trigger full-sync pages tiếp theo (not email.sync)
    if (nextPageToken) {
      this.logger.log(
        `[syncFirstBatch] Triggering next page full-sync for user ${userId}...`,
      );
      this.eventEmitter.emit(
        'email.full-sync',
        new EmailFullSyncEvent(userId, nextPageToken, 1),
      );
    }

    return emailIds;
  }

  async generateEmbeddingsForEmails(
    userId: number,
    emailIds: string[],
  ): Promise<string[]> {
    const BATCH_SIZE = 10;
    const emailsToProcess = await this.emailRepository
      .createQueryBuilder('email')
      .where('email.embedding IS NULL')
      .andWhere('email.userId = :userId', { userId })
      .andWhere('email.id IN (:...emailIds)', { emailIds })
      .take(BATCH_SIZE)
      .getMany();

    if (emailsToProcess.length === 0) {
      return [];
    }

    const updatedEmails = await Promise.all(
      emailsToProcess.map(async (email) => {
        try {
          const textToEmbed = this.prepareTextForEmbedding(email);
          const vector =
            await this.openRouterService.generateEmbedding(textToEmbed);

          return {
            ...email,
            embedding: vector.length === 1536 ? vector : null,
          };
        } catch (error) {
          console.error(`Failed to generate embedding for ${email.id}`, error);
          return null;
        }
      }),
    );

    const validEmails = updatedEmails.filter(
      (e): e is Email => e !== null && e.embedding !== null,
    );
    if (validEmails.length > 0) {
      await this.emailRepository.save(validEmails);
      console.log(
        `Generated embeddings for ${validEmails.length} emails (User ${userId})`,
      );
    }

    const processedIds = new Set(emailsToProcess.map((email) => email.id));
    const remainingIds = emailIds.filter((id) => !processedIds.has(id));

    return remainingIds;
  }

  async syncDeletedEmails(userId: number): Promise<string[]> {
    const gmail = await this.gmailService.getAuthenticatedGmailClient(userId);

    // Get all emails in database for this user
    const dbEmails = await this.emailRepository.find({
      where: { userId },
      select: ['id'],
    });

    if (dbEmails.length === 0) return [];

    const dbEmailIds = dbEmails.map((e) => e.id);
    const deletedEmailIds: string[] = [];

    // Check each email to see if it still exists in Gmail
    for (const emailId of dbEmailIds) {
      try {
        await gmail.users.messages.get({
          userId: 'me',
          id: emailId,
        });
      } catch (error: any) {
        // If error code is 404, email was deleted
        if (error.status === 404) {
          deletedEmailIds.push(emailId);
        }
      }
    }

    // Delete from database if found deleted emails
    if (deletedEmailIds.length > 0) {
      await this.emailRepository.delete({
        id: In(deletedEmailIds),
        userId,
      });
      console.log(
        `Deleted ${deletedEmailIds.length} emails from database for user ${userId}`,
      );
    }

    return deletedEmailIds;
  }

  async syncEmailsWithDeletion(
    userId: number,
    messages: gmail_v1.Schema$Message[],
    gmailClient: any,
  ): Promise<{ newEmailIds: string[]; deletedEmailIds: string[] }> {
    // Get all emails currently in database for this user
    const dbEmails = await this.emailRepository.find({
      where: { userId },
      select: ['id'],
    });

    const dbEmailIdSet = new Set(dbEmails.map((e) => e.id));
    const gmailEmailIdSet = new Set(messages.map((m) => m.id));

    // Find deleted emails (in DB but not in Gmail list)
    const deletedEmailIds = Array.from(dbEmailIdSet).filter(
      (id) => !gmailEmailIdSet.has(id),
    );

    // Find new emails (in Gmail but not in DB)
    const messagesToFetch = messages.filter(
      (m) => !dbEmailIdSet.has(m.id || ''),
    );

    const newEmailIds: string[] = [];

    if (messagesToFetch.length > 0) {
      const fetchedEmails = await Promise.all(
        messagesToFetch.map(async (msg) => {
          try {
            const detail = await gmailClient.users.messages.get({
              format: 'metadata',
              id: msg.id!,
              metadataHeaders: ['Subject', 'From', 'Date'],
              userId: 'me',
            });

            const headers: any[] = detail.data.payload?.headers ?? [];
            return {
              id: msg.id!,
              threadId: msg.threadId!,
              snippet: detail.data.snippet ?? '',
              internalDate: detail.data.internalDate ?? '',
              subject: this.getHeader(headers ?? [], 'Subject'),
              sender: this.getHeader(headers ?? [], 'From'),
              userId: userId,
            };
          } catch (e) {
            console.error(`Failed to fetch msg ${msg.id}`, e);
            return null;
          }
        }),
      );

      const validEmails = fetchedEmails.filter((e) => e !== null);
      if (validEmails.length > 0) {
        await this.emailRepository.save(validEmails);
        console.log(`Saved ${validEmails.length} emails for user ${userId}`);
        newEmailIds.push(...validEmails.map((email) => email.id));
      }
    }

    // Delete removed emails from database
    if (deletedEmailIds.length > 0) {
      await this.emailRepository.delete({
        id: In(deletedEmailIds),
        userId,
      });
      console.log(
        `Deleted ${deletedEmailIds.length} emails from database for user ${userId}`,
      );
    }

    return { newEmailIds, deletedEmailIds };
  }

  async syncEmailsWithHistory(
    userId: number,
  ): Promise<{ newEmailIds: string[]; deletedEmailIds: string[] }> {
    this.logger.log(`[User ${userId}] Starting syncEmailsWithHistory...`);
    let lastHistoryId = await this.gmailService.getLastHistoryId(userId);
    this.logger.log(
      `[User ${userId}] Retrieved lastHistoryId: ${lastHistoryId}`,
    );

    // If no last history ID exists, get it from profile
    if (!lastHistoryId) {
      this.logger.log(
        `[User ${userId}] No lastHistoryId found, fetching from profile...`,
      );
      const profile = await this.gmailService.getProfile(userId);
      lastHistoryId = profile.historyId || null;
      this.logger.log(`[User ${userId}] Profile historyId: ${lastHistoryId}`);

      // Save the history ID for future syncs
      if (lastHistoryId) {
        await this.gmailService.updateLastHistoryId(userId, lastHistoryId);
        this.logger.log(`[User ${userId}] Saved lastHistoryId to database`);
      }

      // Return empty result for first sync - this prevents history errors
      // Subsequent syncs will use the stored historyId
      this.logger.log(
        `[User ${userId}] First sync - returning empty to prevent history errors`,
      );
      return { newEmailIds: [], deletedEmailIds: [] };
    }

    this.logger.log(
      `[User ${userId}] Fetching mailbox history starting from: ${lastHistoryId}`,
    );
    const historyRes = await this.gmailService.getMailboxHistory(
      userId,
      lastHistoryId,
    );
    this.logger.log(
      `[User ${userId}] Received history response with ${historyRes.history?.length || 0} records`,
    );

    const result = await this.processHistoryRecords(userId, historyRes);

    this.logger.log(
      `[User ${userId}] History sync completed - New: ${result.newEmailIds.length}, Deleted: ${result.deletedEmailIds.length}`,
    );

    // If there are more pages, listener will emit next event
    // This method only handles first batch
    return result;
  }

  async processHistoryRecords(
    userId: number,
    historyRes: any,
  ): Promise<{ newEmailIds: string[]; deletedEmailIds: string[] }> {
    this.logger.log(`[User ${userId}] Processing history records...`);
    const history = historyRes.history || [];
    const newEmailIds: string[] = [];
    const deletedEmailIds: string[] = [];

    this.logger.log(
      `[User ${userId}] Found ${history.length} history records to process`,
    );

    // Process all history records
    for (const record of history) {
      // Handle added messages
      if (record.messagesAdded) {
        this.logger.log(
          `[User ${userId}] Found ${record.messagesAdded.length} messages added`,
        );
        for (const { message } of record.messagesAdded) {
          if (message?.id && typeof message.id === 'string') {
            newEmailIds.push(message.id as string);
          }
        }
      }

      // Handle deleted messages
      if (record.messagesDeleted) {
        this.logger.log(
          `[User ${userId}] Found ${record.messagesDeleted.length} messages deleted`,
        );
        for (const { message } of record.messagesDeleted) {
          if (message?.id && typeof message.id === 'string') {
            deletedEmailIds.push(message.id as string);
          }
        }
      }
    }

    this.logger.log(
      `[User ${userId}] After parsing: ${newEmailIds.length} new, ${deletedEmailIds.length} deleted`,
    );

    // Save new emails to database
    if (newEmailIds.length > 0) {
      this.logger.log(
        `[User ${userId}] Fetching details for ${newEmailIds.length} new emails...`,
      );
      const gmailClient =
        await this.gmailService.getAuthenticatedGmailClient(userId);
      const fetchedEmails = await Promise.all(
        newEmailIds.map(async (emailId) => {
          try {
            const detail = await gmailClient.users.messages.get({
              format: 'metadata',
              id: emailId,
              metadataHeaders: ['Subject', 'From', 'Date'],
              userId: 'me',
            });

            const headers: any[] = detail.data.payload?.headers ?? [];
            return {
              id: emailId,
              threadId: detail.data.threadId || '',
              snippet: detail.data.snippet ?? '',
              internalDate: detail.data.internalDate ?? '',
              subject: this.getHeader(headers, 'Subject'),
              sender: this.getHeader(headers, 'From'),
              userId: userId,
            };
          } catch (e) {
            this.logger.error(`Failed to fetch msg ${emailId}`, e);
            return null;
          }
        }),
      );

      const validEmails = fetchedEmails.filter((e) => e !== null);
      this.logger.log(
        `[User ${userId}] Successfully fetched ${validEmails.length} emails`,
      );

      if (validEmails.length > 0) {
        const existingIds = await this.emailRepository.find({
          where: { id: In(validEmails.map((e) => e.id)) },
          select: ['id'],
        });
        const existingIdSet = new Set(existingIds.map((e) => e.id));

        const emailsToSave = validEmails.filter(
          (e) => !existingIdSet.has(e.id),
        );

        if (emailsToSave.length > 0) {
          await this.emailRepository.save(emailsToSave);
          this.logger.log(
            `[User ${userId}] Saved ${emailsToSave.length} new emails to database`,
          );
        } else {
          this.logger.log(
            `[User ${userId}] All emails already exist in database`,
          );
        }
      }
    }

    // Delete removed emails from database
    if (deletedEmailIds.length > 0) {
      await this.emailRepository.delete({
        id: In(deletedEmailIds),
        userId,
      });
      this.logger.log(
        `[User ${userId}] Deleted ${deletedEmailIds.length} emails from database`,
      );
    }

    // Update lastHistoryId
    if (historyRes.historyId && typeof historyRes.historyId === 'string') {
      await this.gmailService.updateLastHistoryId(
        userId,
        historyRes.historyId as string,
      );
      this.logger.log(
        `[User ${userId}] Updated lastHistoryId to ${historyRes.historyId}`,
      );
    }

    return { newEmailIds, deletedEmailIds };
  }
}
