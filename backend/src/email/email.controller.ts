import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AtGuard } from '../auth/guards/at.guard';
import { EmailService } from './email.service';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { DeleteBatchEmailDto } from './dto/delete-batch-email.dto';
import { ReplyType } from './dto/reply-email.dto';
import { BatchModifyEmailDto } from './dto/batch-modify-email.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ReplyEmailSwaggerDto } from './dto/reply-email-swagger.dto';
import { SendEmailSwaggerDto } from './dto/send-email-swagger.dto';
import { parseBoolean, parseEmailArray } from '../utils/form-data-parser.util';

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

  @Post('batch-modify')
  @ApiSecurity('jwt')
  async batchModifyEmails(
    @Req() req,
    @Body() batchModifyDto: BatchModifyEmailDto,
  ) {
    return this.emailService.batchModifyEmails(req.user.sub, batchModifyDto);
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
    summary: 'Send new email with attachments',
    description: `
Send a new email message with optional file attachments.

## Request Format

**Content-Type:** \`multipart/form-data\`

### How to send arrays in multipart/form-data:

**Option 1: JSON String (Recommended)**
\`\`\`
to: ["recipient1@example.com","recipient2@example.com"]
\`\`\`

**Option 2: Comma-separated**
\`\`\`
to: recipient1@example.com, recipient2@example.com
\`\`\`

**Option 3: Single value**
\`\`\`
to: recipient@example.com
\`\`\`

### Example (JavaScript/Fetch):
\`\`\`javascript
const formData = new FormData();
formData.append('to', JSON.stringify(['user1@example.com', 'user2@example.com']));
formData.append('subject', 'Test Email');
formData.append('textBody', 'Hello World');
formData.append('files', fileInput.files[0]);

fetch('http://localhost:3000/api/emails/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
  },
  body: formData,
});
\`\`\`

### Example (curl):
\`\`\`bash
curl -X POST http://localhost:3000/api/emails/send \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F 'to=["recipient@example.com"]' \\
  -F 'subject=Test Email' \\
  -F 'textBody=Hello World' \\
  -F 'files=@/path/to/document.pdf'
\`\`\`
    `,
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiBody({
    description: 'Email data with optional file attachments',
    type: SendEmailSwaggerDto, // ✅ Use DTO for clearer documentation
    schema: {
      type: 'object',
      properties: {
        to: {
          oneOf: [
            {
              type: 'array',
              items: { type: 'string', format: 'email' },
              description: 'Array of email addresses',
              example: ['recipient1@example.com', 'recipient2@example.com'],
            },
            {
              type: 'string',
              description: 'JSON string array or comma-separated emails',
              example: '["recipient1@example.com","recipient2@example.com"]',
            },
          ],
          description: `
**Logical type:** Array of email addresses  
**Multipart format:** Send as JSON string: \`["email1@example.com","email2@example.com"]\`
          `,
        },
        cc: {
          oneOf: [
            {
              type: 'array',
              items: { type: 'string', format: 'email' },
            },
            {
              type: 'string',
              description: 'JSON string array or comma-separated',
            },
          ],
          description: 'CC recipients (optional)',
        },
        bcc: {
          oneOf: [
            {
              type: 'array',
              items: { type: 'string', format: 'email' },
            },
            {
              type: 'string',
              description: 'JSON string array or comma-separated',
            },
          ],
          description: 'BCC recipients (optional)',
        },
        subject: {
          type: 'string',
          description: 'Email subject',
          example: 'Q4 Report - Review Required',
        },
        textBody: {
          type: 'string',
          description: 'Plain text body',
          example: 'Please review the attached Q4 report.',
        },
        htmlBody: {
          type: 'string',
          description: 'HTML body',
          example: '<div><h1>Q4 Report</h1><p>Please review.</p></div>',
        },
        threadId: {
          type: 'string',
          description: 'Thread ID for existing conversation',
          example: '18d8f2a3b4c5d6e7',
        },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'File attachments (max 10 files, 25MB total)',
        },
      },
      required: ['to', 'subject'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Email sent successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '18d8f2a3b4c5d6e7' },
        threadId: { type: 'string', example: '18d8f2a3b4c5d6e7' },
        labelIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['SENT', 'INBOX'],
        },
        snippet: { type: 'string', example: 'Please review the attached...' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 413, description: 'Payload Too Large' })
  async sendEmail(
    @Req() req,
    @Body('to') to: string,
    @Body('cc') cc?: string,
    @Body('bcc') bcc?: string,
    @Body('subject') subject?: string,
    @Body('textBody') textBody?: string,
    @Body('htmlBody') htmlBody?: string,
    @Body('threadId') threadId?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const toArray = parseEmailArray(to);
    const ccArray = parseEmailArray(cc);
    const bccArray = parseEmailArray(bcc);

    if (!toArray || toArray.length === 0) {
      throw new BadRequestException('At least one recipient is required');
    }

    if (!subject) {
      throw new BadRequestException('Subject is required');
    }

    if (!textBody && !htmlBody) {
      throw new BadRequestException(
        'At least one of textBody or htmlBody is required',
      );
    }

    return this.emailService.sendEmail(req.user.sub, {
      to: toArray,
      cc: ccArray,
      bcc: bccArray,
      subject,
      textBody,
      htmlBody,
      threadId,
      files,
    });
  }

  @Post(':id/reply')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Reply or forward email',
    description: `
Reply to an email or forward it to other recipients.

## Request Format

**Content-Type:** \`multipart/form-data\`

### How to send recipient arrays:
Use JSON string format: \`["email1@example.com","email2@example.com"]\`

### Example (JavaScript):
\`\`\`javascript
const formData = new FormData();
formData.append('type', 'forward');
formData.append('to', JSON.stringify(['colleague@example.com', 'manager@example.com']));
formData.append('textBody', 'FYI - Please review.');
formData.append('includeOriginalAttachments', 'true');
formData.append('files', newFile);

fetch('http://localhost:3000/api/emails/18d8f2a3b4c5d6e7/reply', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_JWT_TOKEN' },
  body: formData,
});
\`\`\`
    `,
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiBody({
    description: 'Reply/Forward data with optional file attachments',
    type: ReplyEmailSwaggerDto,
    schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['reply', 'reply_all', 'forward'],
          example: 'reply',
        },
        to: {
          oneOf: [
            {
              type: 'array',
              items: { type: 'string', format: 'email' },
              description: 'Array of email addresses',
            },
            {
              type: 'string',
              description: 'JSON string: ["email1@example.com"]',
            },
          ],
          description:
            'Recipients (required for forward, optional for reply_all)',
        },
        cc: {
          oneOf: [
            { type: 'array', items: { type: 'string', format: 'email' } },
            { type: 'string', description: 'JSON string array' },
          ],
        },
        bcc: {
          oneOf: [
            { type: 'array', items: { type: 'string', format: 'email' } },
            { type: 'string', description: 'JSON string array' },
          ],
        },
        subject: { type: 'string', example: 'Fwd: Important Document' },
        textBody: { type: 'string', example: 'Thanks for your email.' },
        htmlBody: { type: 'string', example: '<div><p>Thanks!</p></div>' },
        includeOriginalAttachments: {
          type: 'string',
          enum: ['true', 'false'],
          description: 'String "true" or "false" (multipart limitation)',
          example: 'true',
        },
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['type'],
    },
  })
  @ApiResponse({ status: 201, description: 'Reply/Forward sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Original email not found' })
  async replyToEmail(
    @Req() req,
    @Param('id') emailId: string,
    @Body('type') type: string,
    @Body('to') to?: string,
    @Body('cc') cc?: string,
    @Body('bcc') bcc?: string,
    @Body('subject') subject?: string,
    @Body('textBody') textBody?: string,
    @Body('htmlBody') htmlBody?: string,
    @Body('includeOriginalAttachments') includeOriginalAttachments?: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    if (!['reply', 'reply_all', 'forward'].includes(type)) {
      throw new BadRequestException('Invalid reply type');
    }

    return this.emailService.replyToEmail(req.user.sub, emailId, {
      type: type as ReplyType,
      to: parseEmailArray(to),
      cc: parseEmailArray(cc),
      bcc: parseEmailArray(bcc),
      subject,
      textBody,
      htmlBody,
      includeOriginalAttachments: parseBoolean(includeOriginalAttachments),
      files,
    });
  }
}
