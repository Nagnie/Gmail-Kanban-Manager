import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { AtGuard } from 'src/auth/guards/at.guard';
import { EmailService } from './email.service';
import { EmailSynceService } from './email_sync.service';

@Controller('emails_sync')
@UseGuards(AtGuard)
export class EmailSyncController {
  constructor(
    private readonly emailService: EmailService,
    private readonly emailSyncService: EmailSynceService,
  ) {}

  @Get('sync')
  @ApiSecurity('jwt')
  syncEmails(@Req() req) {
    return this.emailSyncService.syncEmailsForUser(req.user.sub);
  }
}
