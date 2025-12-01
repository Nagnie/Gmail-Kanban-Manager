import { Module } from '@nestjs/common';
import { MailboxController } from './mailbox.controller';
import { MailboxService } from './mailbox.service';
import { GmailModule } from '../gmail/gmail.module';
import { ThreadModule } from 'src/thread/thread.module';

@Module({
  imports: [GmailModule, ThreadModule],
  controllers: [MailboxController],
  providers: [MailboxService],
})
export class MailboxModule {}
