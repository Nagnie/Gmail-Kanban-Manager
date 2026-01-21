import { Module, forwardRef } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { GmailController } from './gmail.controller';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { SnoozeModule } from 'src/snooze/snooze.module';
import { GmailScheduler } from 'src/gmail/gmail.scheduler';
import { Email } from 'src/email/entities/email.entity';
import { EmailModule } from 'src/email/email.module';
import { GmailSyncState } from './entities/gmail-sync-state.entity';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([User, Email, GmailSyncState]),
    forwardRef(() => SnoozeModule),
    forwardRef(() => EmailModule),
  ],
  controllers: [GmailController],
  providers: [GmailService, GmailScheduler],
  exports: [GmailService],
})
export class GmailModule {}
