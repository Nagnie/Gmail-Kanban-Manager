import { BadRequestException, Injectable } from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';
import { parseEmailDetail, hasAttachments } from '../utils/email.util';
import { gmail_v1 } from 'googleapis';
import { EmailDetailDto } from './dto/email-detail.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { DeleteBatchEmailDto } from './dto/delete-batch-email.dto';
import { AttachmentDto, SendEmailDto } from './dto/send-email.dto';
import { ReplyEmailDto, ReplyType } from './dto/reply-email.dto';
import { BatchModifyEmailDto } from 'src/email/dto/batch-modify-email.dto';

@Injectable()
export class EmailService {
  constructor(private readonly gmailService: GmailService) {}

  async getEmailDetail(
    userId: number,
    emailId: string,
  ): Promise<EmailDetailDto> {
    const message = await this.gmailService.getMessage(userId, emailId);

    const parsedMessage = parseEmailDetail(message);

    return parsedMessage;
  }

  async modifyEmail(
    userId: number,
    emailId: string,
    modifyDto: ModifyEmailDto,
  ) {
    if (!modifyDto.addLabelIds && !modifyDto.removeLabelIds) {
      throw new BadRequestException(
        'Must provide at least addLabelIds or removeLabelIds',
      );
    }

    const requestBody: gmail_v1.Schema$ModifyMessageRequest = {
      addLabelIds: modifyDto.addLabelIds,
      removeLabelIds: modifyDto.removeLabelIds,
    };

    const modifiedMessage = await this.gmailService.modifyMessage(
      userId,
      emailId,
      requestBody,
    );

    const parsedMessage = parseEmailDetail(modifiedMessage);

    return parsedMessage;
  }

  async batchModifyEmails(userId: number, batchModifyDto: BatchModifyEmailDto) {
    const requestBody: gmail_v1.Schema$BatchModifyMessagesRequest = {
      ids: batchModifyDto.ids,
      addLabelIds: batchModifyDto.addLabelIds,
      removeLabelIds: batchModifyDto.removeLabelIds,
    };

    const response = await this.gmailService.batchModifyMessages(
      userId,
      requestBody,
    );

    return response;
  }

  async markAsRead(userId: number, emailId: string): Promise<EmailDetailDto> {
    return this.modifyEmail(userId, emailId, {
      removeLabelIds: ['UNREAD'],
    });
  }

  async markAsUnread(userId: number, emailId: string): Promise<EmailDetailDto> {
    return this.modifyEmail(userId, emailId, {
      addLabelIds: ['UNREAD'],
    });
  }

  async starEmail(userId: number, emailId: string): Promise<EmailDetailDto> {
    return this.modifyEmail(userId, emailId, {
      addLabelIds: ['STARRED'],
    });
  }

  async unstarEmail(userId: number, emailId: string): Promise<EmailDetailDto> {
    return this.modifyEmail(userId, emailId, {
      removeLabelIds: ['STARRED'],
    });
  }

  async moveToTrash(userId: number, emailId: string): Promise<EmailDetailDto> {
    // return this.modifyEmail(userId, emailId, {
    //   addLabelIds: ['TRASH'],
    //   removeLabelIds: ['INBOX'],
    // });

    const trashedMessage = await this.gmailService.moveMessageToTrash(
      userId,
      emailId,
    );

    const parsedMessage = parseEmailDetail(trashedMessage);

    return parsedMessage;
  }

  async moveToInbox(userId: number, emailId: string): Promise<EmailDetailDto> {
    return this.modifyEmail(userId, emailId, {
      addLabelIds: ['INBOX'],
      removeLabelIds: ['TRASH', 'SPAM'],
    });
  }

  async untrashEmail(userId: number, emailId: string): Promise<EmailDetailDto> {
    const untrashedMessage = await this.gmailService.untrashMessage(
      userId,
      emailId,
    );
    const parsedMessage = parseEmailDetail(untrashedMessage);
    return parsedMessage;
  }

  async archiveEmail(userId: number, emailId: string): Promise<EmailDetailDto> {
    return this.modifyEmail(userId, emailId, {
      removeLabelIds: ['INBOX'],
    });
  }

  async deleteEmail(userId: number, emailId: string): Promise<void> {
    await this.gmailService.deleteMessage(userId, emailId);
  }

  async batchDeleteEmails(
    userId: number,
    deleteBatchEmailDto: DeleteBatchEmailDto,
  ): Promise<void> {
    if (deleteBatchEmailDto.ids.length === 0) {
      throw new BadRequestException('No email IDs provided for deletion');
    }

    await this.gmailService.batchDeleteMessages(
      userId,
      deleteBatchEmailDto.ids,
    );
  }

  async sendEmail(userId: number, sendEmailDto: SendEmailDto) {
    // Validate at least one recipient
    if (!sendEmailDto.to || sendEmailDto.to.length === 0) {
      throw new BadRequestException('At least one recipient is required');
    }

    const rawMessage = this.buildRFC822Message(sendEmailDto);

    const encodedMessage = this.encodeBase64Url(rawMessage);

    const sentMessage = await this.gmailService.sendEmail(
      userId,
      encodedMessage,
      sendEmailDto.threadId,
    );

    const parsedMessage = parseEmailDetail(sentMessage);

    return parsedMessage;
  }

  async replyToEmail(userId: number, emailId: string, replyDto: ReplyEmailDto) {
    const originalMessage = await this.getEmailDetail(userId, emailId);
    if (!originalMessage) {
      throw new BadRequestException('Original email not found');
    }

    // Build reply message
    const sendDto = this.buildReplyMessage(originalMessage, replyDto);

    // Send via existing send method
    return this.sendEmail(userId, sendDto);
  }

  private buildReplyMessage(
    originalMessage: EmailDetailDto,
    replyDto: ReplyEmailDto,
  ) {
    const headers = originalMessage.headers;

    const originalFrom = headers.from;
    const originalTo = headers.to;
    const originalCc = headers.cc;
    const originalSubject = headers.subject || '';
    const originalDate = headers.date || '';

    const {
      body: { htmlBody, textBody, attachments: originalAttachments },
    } = originalMessage;

    let to: string[] = [];
    let cc: string[] = [];
    let bcc: string[] = [];
    let subject: string;

    const originalToList = this.parseEmailAddresses(originalTo);

    switch (replyDto.type) {
      case ReplyType.REPLY:
        // Reply to sender only
        to = this.parseEmailAddresses(originalFrom);

        // Add BCC from replyDto
        bcc = replyDto.bcc || [];

        subject = this.buildReplySubject(originalSubject);
        break;
      case ReplyType.REPLY_ALL:
        // Reply to sender + all recipients
        to = this.parseEmailAddresses(originalFrom);

        // Add original To recipients
        to.push(...originalToList);

        // Add original Cc recipients
        if (originalCc) {
          cc = this.parseEmailAddresses(originalCc);
        }

        // Add additional recipients from replyDto
        if (replyDto.to) {
          to.push(...replyDto.to);
        }
        if (replyDto.cc) {
          cc.push(...replyDto.cc);
        }

        // Add BCC from replyDto
        bcc = replyDto.bcc || [];

        // Remove duplicates
        to = [...new Set(to)];
        cc = [...new Set(cc)];

        subject = this.buildReplySubject(originalSubject);
        break;

      case ReplyType.FORWARD:
        // Forward requires recipients from replyDto
        to = replyDto.to!;
        cc = replyDto.cc || [];
        bcc = replyDto.bcc || [];

        subject = replyDto.subject || this.buildForwardSubject(originalSubject);
        break;
    }

    // Build quoted content
    const quotedTextBody = this.buildQuotedText(
      textBody || htmlBody || '',
      originalFrom,
      originalDate,
    );

    const quotedHtmlBody = this.buildQuotedHtml(
      htmlBody || textBody || '',
      originalFrom,
      originalDate,
    );

    // Combine reply body with quoted content
    const finalTextBody = replyDto.textBody
      ? `${replyDto.textBody}\n\n${quotedTextBody}`
      : quotedTextBody;

    const finalHtmlBody = replyDto.htmlBody
      ? `<div>${replyDto.htmlBody}</div><br>${quotedHtmlBody}`
      : quotedHtmlBody;

    // Handle attachments
    const allAttachments: AttachmentDto[] = [];

    if (replyDto.includeOriginalAttachments) {
      const attachments = originalAttachments.map((att) => ({
        filename: att.filename,
        mimeType: att.mimeType,
        data: att.inlineData!,
      }));
      allAttachments.push(...attachments);
    }

    // Add new attachments from replyDto
    if (replyDto.newAttachments && replyDto.newAttachments.length > 0) {
      allAttachments.push(...replyDto.newAttachments);
    }

    return {
      to,
      cc: cc.length > 0 ? cc : undefined,
      bcc: bcc.length > 0 ? bcc : undefined,
      subject,
      textBody: finalTextBody,
      htmlBody: finalHtmlBody,
      threadId: originalMessage.threadId,
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
    };
  }

  private parseEmailAddresses(headerValue: string): string[] {
    if (!headerValue) return [];

    // Simple regex to extract emails
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const matches = headerValue.match(emailRegex);

    return matches || [];
  }

  private buildReplySubject(originalSubject: string): string {
    if (!originalSubject) return 'Re: ';

    const subject = originalSubject.trim();

    // Check if already has Re: prefix
    if (/^re:/i.test(subject)) {
      return subject;
    }

    return `Re: ${subject}`;
  }

  private buildForwardSubject(originalSubject: string): string {
    const subject = originalSubject?.trim() || '';
    return `Fwd: ${subject}`;
  }

  private buildQuotedText(
    originalBody: string,
    from: string,
    date: string,
  ): string {
    const lines = ['', `On ${date}, ${from} wrote:`, ''];

    // Add > prefix to each line
    const quotedLines = originalBody.split('\n').map((line) => `> ${line}`);
    lines.push(...quotedLines);

    return lines.join('\n');
  }

  private buildQuotedHtml(
    originalBody: string,
    from: string,
    date: string,
  ): string {
    return `
      <div class="gmail_quote">
        <div class="gmail_attr">
          On ${this.escapeHtml(date)}, ${this.escapeHtml(from)} wrote:
        </div>
        <blockquote class="gmail_quote" style="margin:0 0 0 .8ex;border-left:1px #ccc solid;padding-left:1ex">
          ${originalBody}
        </blockquote>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private buildRFC822Message(sendDto: SendEmailDto): string {
    const boundary = this.generateBoundary();
    const lines: string[] = [];

    // Headers
    lines.push(`To: ${sendDto.to.join(', ')}`);

    if (sendDto.cc && sendDto.cc.length > 0) {
      lines.push(`Cc: ${sendDto.cc.join(', ')}`);
    }

    if (sendDto.bcc && sendDto.bcc.length > 0) {
      lines.push(`Bcc: ${sendDto.bcc.join(', ')}`);
    }

    lines.push(`Subject: ${sendDto.subject}`);
    lines.push('MIME-Version: 1.0');

    // Check if multipart (has attachments or both text and HTML)
    const hasAttachments =
      sendDto.attachments && sendDto.attachments.length > 0;
    const hasBothBodies = sendDto.textBody && sendDto.htmlBody;

    if (hasAttachments) {
      // Multipart mixed (for attachments)
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      lines.push('');

      // Body part
      if (hasBothBodies) {
        lines.push(`--${boundary}`);
        lines.push(
          `Content-Type: multipart/alternative; boundary="${boundary}_alt"`,
        );
        lines.push('');

        // Text version
        lines.push(`--${boundary}_alt`);
        lines.push('Content-Type: text/plain; charset="UTF-8"');
        lines.push('');
        lines.push(sendDto.textBody!);
        lines.push('');

        // HTML version
        lines.push(`--${boundary}_alt`);
        lines.push('Content-Type: text/html; charset="UTF-8"');
        lines.push('');
        lines.push(sendDto.htmlBody!);
        lines.push('');
        lines.push(`--${boundary}_alt--`);
      } else {
        // Single body type
        lines.push(`--${boundary}`);
        if (sendDto.htmlBody) {
          lines.push('Content-Type: text/html; charset="UTF-8"');
          lines.push('');
          lines.push(sendDto.htmlBody);
        } else {
          lines.push('Content-Type: text/plain; charset="UTF-8"');
          lines.push('');
          lines.push(sendDto.textBody!);
        }
        lines.push('');
      }

      // Attachments
      for (const attachment of sendDto.attachments!) {
        lines.push(`--${boundary}`);
        lines.push(
          `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
        );
        lines.push(
          `Content-Disposition: attachment; filename="${attachment.filename}"`,
        );
        lines.push('Content-Transfer-Encoding: base64');
        lines.push('');
        lines.push(attachment.data);
        lines.push('');
      }

      lines.push(`--${boundary}--`);
    } else if (hasBothBodies) {
      // Multipart alternative (text + HTML, no attachments)
      lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
      lines.push('');

      // Text version
      lines.push(`--${boundary}`);
      lines.push('Content-Type: text/plain; charset="UTF-8"');
      lines.push('');
      lines.push(sendDto.textBody!);
      lines.push('');

      // HTML version
      lines.push(`--${boundary}`);
      lines.push('Content-Type: text/html; charset="UTF-8"');
      lines.push('');
      lines.push(sendDto.htmlBody!);
      lines.push('');

      lines.push(`--${boundary}--`);
    } else {
      // Simple message (single body type, no attachments)
      if (sendDto.htmlBody) {
        lines.push('Content-Type: text/html; charset="UTF-8"');
        lines.push('');
        lines.push(sendDto.htmlBody);
      } else {
        lines.push('Content-Type: text/plain; charset="UTF-8"');
        lines.push('');
        lines.push(sendDto.textBody!);
      }
    }

    return lines.join('\r\n');
  }

  private generateBoundary(): string {
    return `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private encodeBase64Url(data: string): string {
    // Convert to Buffer
    const buffer = Buffer.from(data, 'utf-8');

    // Encode to base64
    let base64 = buffer.toString('base64');

    // Convert to base64url (URL-safe)
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return base64;
  }

  hasAttachments(payload: gmail_v1.Schema$MessagePart) {
    return hasAttachments(payload);
  }
}
