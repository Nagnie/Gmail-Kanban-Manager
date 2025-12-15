import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { GmailModule } from '../gmail/gmail.module';
import { EmailSynceService } from './email_sync.service';
import { Email } from './entities/email.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailSyncController } from './email_sync.controller';
import { EmailSyncListener } from './listeners/email_sync.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Email]), GmailModule],
  controllers: [EmailController, EmailSyncController],
  providers: [EmailService, EmailSynceService, EmailSyncListener],
  exports: [EmailService],
})
export class EmailModule {}
