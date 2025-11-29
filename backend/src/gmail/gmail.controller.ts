import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { AtGuard } from 'src/auth/guards/at.guard';
import { ApiSecurity } from '@nestjs/swagger';

@Controller('gmail')
@UseGuards(AtGuard)
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Get('mailboxes')
  @ApiSecurity('jwt')
  async getMailboxes(@Req() req) {
    return this.gmailService.listLabels(req.user.sub);
  }

  @Get('emails')
  async getEmails(
    @Req() req, 
    @Query('q') q: string, 
    @Query('pageToken') pageToken: string
  ) {
    return this.gmailService.listMessages(req.user.sub, q, pageToken);
  }

  @Get('emails/:id')
  async getEmailDetail(@Req() req, @Param('id') id: string) {
    return this.gmailService.getMessage(req.user.sub, id);
  }

  @Post('emails/send')
  async sendEmail(@Req() req, @Body() body: { raw: string }) {
    // Lưu ý: Frontend cần construct MIME message và encode base64url
    return this.gmailService.sendMessage(req.user.sub, body.raw);
  }
}
