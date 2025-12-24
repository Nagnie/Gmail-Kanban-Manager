import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Email } from '../entities/email.entity';
import { OpenRouterService } from '../../open-router/open-router.service';
import { GenerateEmbeddingsEvent } from '../events/generate_embedding.event';

@Injectable()
export class GenerateEmbeddingListener {
  private readonly logger = new Logger(GenerateEmbeddingListener.name);

  constructor(
    @InjectRepository(Email)
    private emailRepository: Repository<Email>,
    private openRouterService: OpenRouterService,
  ) {}

  @OnEvent('emails.embeddings.generate')
  async handleGenerateEmbeddings(payload: GenerateEmbeddingsEvent) {
    const { emailIds } = payload;
    this.logger.log(
      `Starting background embedding generation for ${emailIds.length} emails...`,
    );

    const emails = await this.emailRepository.find({
      where: { id: In(emailIds) },
      select: ['id', 'subject', 'sender', 'snippet', 'summary'],
    });

    for (const email of emails) {
      try {
        const textToEmbed = this.prepareTextForEmbedding(email);

        const vector =
          await this.openRouterService.generateEmbedding(textToEmbed);

        if (vector && vector.length > 0) {
          await this.emailRepository.update(email.id, {
            embedding: JSON.stringify(vector) as any,
          });
        }

        await this.sleep(100);
      } catch (error) {
        this.logger.error(`Failed to embed email ${email.id}`, error.message);
      }
    }

    this.logger.log('Finished embedding generation');
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private prepareTextForEmbedding(email: any): string {
    return `
        Subject: ${email.subject}
        From: ${email.sender}
        Content: ${email.summary || email.snippet || ''}
    `.trim();
  }
}
