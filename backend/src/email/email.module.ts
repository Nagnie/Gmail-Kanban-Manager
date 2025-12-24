import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { GmailModule } from '../gmail/gmail.module';
import { EmailSynceService } from './sync/email_sync.service';
import { Email } from './entities/email.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSyncListener } from './listeners/email_sync.listener';
import { EmailSyncController } from './sync/email_sync.controller';
import { EmailSearchService } from './search/email_search.service';
import { EmailSearchController } from './search/email_search.controller';
import { EmailEmbeddingListener } from './listeners/email_embedding.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Email]), GmailModule],
  controllers: [EmailController, EmailSyncController, EmailSearchController],
  providers: [
    EmailService,
    EmailSynceService,
    EmailSearchService,
    EmailSyncListener,
    EmailEmbeddingListener,
  ],
  exports: [EmailService],
})
export class EmailModule {}
