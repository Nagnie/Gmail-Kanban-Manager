import { Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { GmailController } from './gmail.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    UserModule
  ],
  controllers: [GmailController],
  providers: [GmailService],
})
export class GmailModule {}
