import { Module, forwardRef } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { GmailController } from './gmail.controller';
import { UserModule } from 'src/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { SnoozeModule } from 'src/snooze/snooze.module';
import { GmailScheduler } from 'src/gmail/gmail.scheduler';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([User]),
    forwardRef(() => SnoozeModule),
  ],
  controllers: [GmailController],
  providers: [GmailService, GmailScheduler],
  exports: [GmailService],
})
export class GmailModule {}
