import { Injectable, Logger } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { EmailEmbeddingEvent } from '../events/email_embedding.event';
import { EmailSynceService } from '../sync/email_sync.service';

@Injectable()
export class EmailEmbeddingListener {
  private readonly logger = new Logger(EmailEmbeddingListener.name);
  private readonly MAX_BATCHES = 50;

  constructor(
    private emailSyncService: EmailSynceService,
    private eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('email.embedding', { async: true })
  async handleGenerateEmbeddings(payload: EmailEmbeddingEvent) {
    const { userId, emailIds, batchNumber } = payload;

    if (emailIds.length === 0 || batchNumber > this.MAX_BATCHES) {
      this.logger.log(
        `Embedding generation finished for User ${userId}. Batches: ${batchNumber}`,
      );
      return;
    }

    try {
      this.logger.debug(
        `Generating embeddings batch ${batchNumber} for User ${userId} (${emailIds.length} emails)...`,
      );

      const remainingIds =
        await this.emailSyncService.generateEmbeddingsForEmails(
          userId,
          emailIds,
        );

      // Delay để tránh rate limit
      await this.sleep(1000);

      // Nếu còn emails cần xử lý, emit event tiếp
      if (remainingIds.length > 0) {
        this.eventEmitter.emit(
          'email.embedding',
          new EmailEmbeddingEvent(userId, remainingIds, batchNumber + 1),
        );
      }
    } catch (error) {
      this.logger.error(
        `Error generating embeddings for user ${userId}`,
        error,
      );
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
