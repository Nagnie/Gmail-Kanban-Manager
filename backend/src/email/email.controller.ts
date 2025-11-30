import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AtGuard } from '../auth/guards/at.guard';
import { EmailService } from './email.service';
import { ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ModifyEmailDto } from 'src/email/dto/modify-email.dto';
import { DeleteBatchEmailDto } from 'src/email/dto/delete-batch-email.dto';
import { SendEmailDto } from 'src/email/dto/send-email.dto';
import { ReplyEmailDto } from 'src/email/dto/reply-email.dto';

@Controller('emails')
@UseGuards(AtGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Delete('batch-delete')
  @ApiSecurity('jwt')
  async batchDeleteEmails(
    @Req() req,
    @Body() deleteBatchEmailDto: DeleteBatchEmailDto,
  ) {
    return this.emailService.batchDeleteEmails(
      req.user.sub,
      deleteBatchEmailDto,
    );
  }

  @Get(':id')
  @ApiSecurity('jwt')
  async getEmailDetail(@Req() req, @Param('id') id: string) {
    return this.emailService.getEmailDetail(req.user.sub, id);
  }

  @Delete(':id')
  @ApiSecurity('jwt')
  async deleteEmail(@Req() req, @Param('id') emailId: string) {
    return this.emailService.deleteEmail(req.user.sub, emailId);
  }

  @Post(':id/modify')
  @ApiSecurity('jwt')
  async modifyEmail(
    @Req() req,
    @Param('id') emailId: string,
    @Body() modifyDto: ModifyEmailDto,
  ) {
    return this.emailService.modifyEmail(req.user.sub, emailId, modifyDto);
  }

  @Post(':id/mark-as-read')
  @ApiSecurity('jwt')
  async markAsRead(@Req() req, @Param('id') emailId: string) {
    return this.emailService.markAsRead(req.user.sub, emailId);
  }

  @Post(':id/mark-as-unread')
  @ApiSecurity('jwt')
  async markAsUnread(@Req() req, @Param('id') emailId: string) {
    return this.emailService.markAsUnread(req.user.sub, emailId);
  }

  @Post(':id/star')
  @ApiSecurity('jwt')
  async starEmail(@Req() req, @Param('id') emailId: string) {
    return this.emailService.starEmail(req.user.sub, emailId);
  }

  @Post(':id/unstar')
  @ApiSecurity('jwt')
  async unstarEmail(@Req() req, @Param('id') emailId: string) {
    return this.emailService.unstarEmail(req.user.sub, emailId);
  }

  @Post(':id/move-to-trash')
  @ApiSecurity('jwt')
  async moveToTrash(@Req() req, @Param('id') emailId: string) {
    return this.emailService.moveToTrash(req.user.sub, emailId);
  }

  @Post(':id/move-to-inbox')
  @ApiSecurity('jwt')
  async moveToInbox(@Req() req, @Param('id') emailId: string) {
    return this.emailService.moveToInbox(req.user.sub, emailId);
  }

  @Post(':id/archive')
  @ApiSecurity('jwt')
  async archiveEmail(@Req() req, @Param('id') emailId: string) {
    return this.emailService.archiveEmail(req.user.sub, emailId);
  }

  @Post(':id/untrash')
  @ApiSecurity('jwt')
  async untrashEmail(@Req() req, @Param('id') emailId: string) {
    return this.emailService.untrashEmail(req.user.sub, emailId);
  }

  @Post('send')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Send new email',
    description: 'Compose and send a new email with optional attachments',
  })
  async sendEmail(@Req() req, @Body() sendDto: SendEmailDto) {
    return this.emailService.sendEmail(req.user.sub, sendDto);
  }

  @Post(':id/reply')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Reply or Forward email',
    description:
      'Reply to sender, reply all, or forward email with quoted content',
  })
  async replyToEmail(
    @Req() req,
    @Param('id') emailId: string,
    @Body() replyDto: ReplyEmailDto,
  ) {
    return this.emailService.replyToEmail(req.user.sub, emailId, replyDto);
  }
}
