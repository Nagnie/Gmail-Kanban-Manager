import { BadRequestException, Injectable } from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';
import { parseEmailDetail, hasAttachments } from '../utils/email.util';
import { gmail_v1 } from 'googleapis';
import { EmailDetailDto } from './dto/email-detail.dto';
import { ModifyEmailDto } from './dto/modify-email.dto';
import { DeleteBatchEmailDto } from './dto/delete-batch-email.dto';
import { AttachmentDto, SendEmailDto } from './dto/send-email.dto';
import { ReplyEmailDto, ReplyType } from './dto/reply-email.dto';
import { BatchModifyEmailDto } from './dto/batch-modify-email.dto';
import {
  parseEmailAddresses,
  removeDuplicateEmails,
  filterAttachmentsWithData,
} from '../utils/email-parser.util';
import {
  buildQuotedText,
  buildQuotedHtml,
  buildReplySubject,
  buildForwardSubject,
} from '../utils/email-formatter.util';
import { encodeBase64Url } from '../utils/email-encoder.util';
import { buildRFC822Message } from '../utils/rfc822-builder.util';

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

    // Validate at least one body content
    if (!sendEmailDto.textBody && !sendEmailDto.htmlBody) {
      throw new BadRequestException(
        'At least one of textBody or htmlBody is required',
      );
    }

    // Validate file sizes before processing
    if (sendEmailDto.files && sendEmailDto.files.length > 0) {
      this.validateAttachmentSizes(sendEmailDto.files);
    }

    const rawMessage = buildRFC822Message(sendEmailDto);
    const encodedMessage = encodeBase64Url(rawMessage);

    const sentMessage = await this.gmailService.sendEmail(
      userId,
      encodedMessage,
      sendEmailDto.threadId,
    );

    const parsedMessage = parseEmailDetail(sentMessage);

    return parsedMessage;
  }

  private validateAttachmentSizes(files: Express.Multer.File[]): void {
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB per file
    const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB total

    // Check individual file size
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(
          `File "${file.originalname}" exceeds 25MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
        );
      }
    }

    // Check total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      throw new BadRequestException(
        `Total attachments size exceeds 25MB limit (${(totalSize / 1024 / 1024).toFixed(2)}MB)`,
      );
    }
  }

  async replyToEmail(userId: number, emailId: string, replyDto: ReplyEmailDto) {
    const originalMessage = await this.getEmailDetail(userId, emailId);

    // Build reply message
    const sendDto = this.buildReplyMessage(originalMessage, replyDto);

    // Send via existing send method
    return this.sendEmail(userId, sendDto);
  }

  private buildReplyMessage(
    originalMessage: EmailDetailDto,
    replyDto: ReplyEmailDto,
  ): SendEmailDto {
    const headers = originalMessage.headers;

    const originalFrom = headers?.from || '';
    const originalTo = headers?.to || '';
    const originalCc = headers?.cc || '';
    const originalSubject = headers?.subject || '';
    const originalDate = headers?.date || '';
    const originalMessageId = headers?.messageId || '';
    const originalReferences = headers?.references || '';
    const originalInReplyTo = headers?.inReplyTo || '';

    const {
      body: { htmlBody, textBody, attachments: originalAttachments = [] },
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

        // Add additional CC from replyDto
        if (replyDto.cc) {
          cc = replyDto.cc;
        }

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
        to = removeDuplicateEmails(to);
        cc = removeDuplicateEmails(cc);
        bcc = removeDuplicateEmails(bcc);

        subject = this.buildReplySubject(originalSubject);
        break;

      case ReplyType.FORWARD:
        // Forward requires recipients from replyDto
        if (!replyDto.to || replyDto.to.length === 0) {
          throw new BadRequestException(
            'Forward requires at least one recipient',
          );
        }
        to = replyDto.to;
        cc = replyDto.cc || [];
        bcc = replyDto.bcc || [];

        subject = replyDto.subject || this.buildForwardSubject(originalSubject);
        break;
    }

    // Build quoted content
    // Use consistent priority: prefer textBody for text, htmlBody for html
    const quotedTextBody = textBody
      ? buildQuotedText(textBody, originalFrom, originalDate)
      : '';
    const quotedHtmlBody = htmlBody
      ? buildQuotedHtml(htmlBody, originalFrom, originalDate)
      : '';

    // Combine reply body with quoted content
    const finalTextBody = replyDto.textBody
      ? `${replyDto.textBody}\n\n${quotedTextBody}`
      : quotedTextBody;

    const finalHtmlBody = replyDto.htmlBody
      ? `<div>${replyDto.htmlBody}</div><br/>${quotedHtmlBody}`
      : quotedHtmlBody;

    // Handle attachments
    const allAttachments: AttachmentDto[] = [];

    // Include original attachments if requested
    if (
      replyDto.includeOriginalAttachments &&
      originalAttachments?.length > 0
    ) {
      const attachments = filterAttachmentsWithData(originalAttachments);
      allAttachments.push(...attachments);
    }

    // Add new attachments from binary files
    if (replyDto.files && replyDto.files.length > 0) {
      for (const file of replyDto.files) {
        allAttachments.push({
          filename: file.originalname,
          mimeType: file.mimetype || 'application/octet-stream',
          data: file.buffer.toString('base64'),
        });
      }
    }

    // Build threading headers for proper Gmail threading
    const threadingHeaders = this.buildThreadingHeaders(
      originalMessageId,
      originalReferences,
      originalInReplyTo,
      replyDto.type,
    );

    return {
      to,
      cc: cc.length > 0 ? cc : undefined,
      bcc: bcc.length > 0 ? bcc : undefined,
      subject,
      textBody: finalTextBody,
      htmlBody: finalHtmlBody,
      threadId: originalMessage.threadId,
      files: undefined, // Don't pass files again (already converted to attachments)
      threadingHeaders,
      // Internal use only - pass converted attachments
      internalAttachments:
        allAttachments.length > 0 ? allAttachments : undefined,
    };
  }

  private parseEmailAddresses(headerValue: string): string[] {
    return parseEmailAddresses(headerValue);
  }

  private buildReplySubject(originalSubject: string): string {
    return buildReplySubject(originalSubject);
  }

  private buildForwardSubject(originalSubject: string): string {
    return buildForwardSubject(originalSubject);
  }

  private buildThreadingHeaders(
    originalMessageId: string,
    originalReferences: string,
    originalInReplyTo: string,
    replyType: ReplyType,
  ) {
    // Forward doesn't need threading headers
    if (replyType === ReplyType.FORWARD) {
      return undefined;
    }

    // For reply/reply-all, we need to build proper threading headers
    // according to RFC 2822 section A.2

    const threadingHeaders: any = {};

    // In-Reply-To should be the Message-ID of the email we're replying to
    if (originalMessageId) {
      threadingHeaders.inReplyTo = originalMessageId;
    }

    // References should contain all previous Message-IDs in the conversation
    // Build from: existing references + original message ID
    let referencesList: string[] = [];

    if (originalReferences) {
      // Parse existing references (space-separated or comma-separated)
      referencesList = originalReferences
        .split(/\s+/)
        .filter((ref) => ref.length > 0);
    }

    // Add the Message-ID we're replying to if not already present
    if (originalMessageId && !referencesList.includes(originalMessageId)) {
      referencesList.push(originalMessageId);
    }

    if (referencesList.length > 0) {
      threadingHeaders.references = referencesList.join(' ');
    }

    return Object.keys(threadingHeaders).length > 0
      ? threadingHeaders
      : undefined;
  }

  hasAttachments(payload: gmail_v1.Schema$MessagePart) {
    return hasAttachments(payload);
  }
}
