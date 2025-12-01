import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AtGuard } from '../auth/guards/at.guard';
import { MailboxService } from './mailbox.service';
import { ApiSecurity } from '@nestjs/swagger';

@Controller('mailboxes')
@UseGuards(AtGuard)
export class MailboxController {
  constructor(private readonly mailboxService: MailboxService) {}

  @Get()
  @ApiSecurity('jwt')
  async getMailboxes(@Req() req) {
    return this.mailboxService.getLabels(req.user.sub);
  }

  @Get(':labelId')
  @ApiSecurity('jwt')
  async getMailbox(@Req() req) {
    const labelId = req.params.labelId;
    return this.mailboxService.getLabel(req.user.sub, labelId);
  }

  @Get(':labelId/emails')
  @ApiSecurity('jwt')
  async getEmailsByLabel(@Req() req) {
    const labelId = req.params.labelId;
    const query = req.query.q;
    const pageToken = req.query.pageToken;
    return this.mailboxService.getEmailsByLabel(
      req.user.email,
      req.user.sub,
      labelId,
      query,
      pageToken,
    );
  }
}
