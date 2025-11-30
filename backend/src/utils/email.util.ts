import { gmail_v1 } from 'googleapis';
import {
  IEmailAttachment,
  IParsedMessageParts,
} from '../email/interfaces/parsed-message.interface';
import { EmailDetailDto } from '../email/dto/email-detail.dto';

export function parseEmailDetail(
  message: gmail_v1.Schema$Message,
): EmailDetailDto {
  const headers = message.payload?.headers || [];
  const { htmlBody, textBody, attachments } = parseMessageParts(
    message.payload,
  );

  return {
    id: message.id!,
    threadId: message.threadId!,
    labelIds: message.labelIds || [],
    snippet: message.snippet || '',

    headers: {
      subject: getHeaderValue(headers, 'Subject') || '',
      from: getHeaderValue(headers, 'From') || '',
      to: getHeaderValue(headers, 'To') || '',
      cc: getHeaderValue(headers, 'Cc') || undefined,
      bcc: getHeaderValue(headers, 'Bcc') || undefined,
      date: getHeaderValue(headers, 'Date') || '',
      replyTo: getHeaderValue(headers, 'Reply-To') || undefined,
      messageId: getHeaderValue(headers, 'Message-ID') || undefined,
      references: getHeaderValue(headers, 'References') || undefined,
      inReplyTo: getHeaderValue(headers, 'In-Reply-To') || undefined,
    },

    body: {
      htmlBody: htmlBody || undefined,
      textBody: textBody || undefined,
      attachments,
    },

    isUnread: message.labelIds?.includes('UNREAD') || false,
    isStarred: message.labelIds?.includes('STARRED') || false,
    isImportant: message.labelIds?.includes('IMPORTANT') || false,

    internalDate: message.internalDate || '',
    sizeEstimate: message.sizeEstimate || 0,
  };
}

export function getHeaderValue(
  headers: gmail_v1.Schema$MessagePartHeader[],
  name: string,
) {
  const header = headers.find(
    (h) => h.name?.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  return header ? header.value : '';
}

export function parseMessageParts(payload?: gmail_v1.Schema$MessagePart) {
  const result: IParsedMessageParts = {
    htmlBody: '',
    textBody: '',
    attachments: [],
  };

  if (!payload) {
    return result;
  }

  traverseMessageParts(payload, result);

  return result;
}

function traverseMessageParts(
  part: gmail_v1.Schema$MessagePart,
  result: IParsedMessageParts,
) {
  // Case 1: Container part (multipart/*) - đệ quy vào parts con
  if (part.parts && part.parts.length > 0) {
    part.parts.forEach((childPart) => {
      traverseMessageParts(childPart, result);
    });
    return;
  }

  // Case 2: Attachment - có filename và có body
  if (isAttachment(part)) {
    const attachment = extractAttachment(part);
    if (attachment) {
      result.attachments.push(attachment);
    }
    return;
  }

  // Case 3: Body content (text/plain hoặc text/html)
  extractBodyContent(part, result);
}

function isAttachment(part: gmail_v1.Schema$MessagePart) {
  return !!(part.filename && part.body && part.body.size && part.body.size > 0);
}

function extractAttachment(part: gmail_v1.Schema$MessagePart) {
  if (!part.filename || !part.body) {
    return null;
  }

  const attachment: IEmailAttachment = {
    filename: part.filename,
    mimeType: part.mimeType || 'application/octet-stream',
    size: part.body.size || 0,
    attachmentId: part.body.attachmentId || undefined,
    inlineData: part.body.data || undefined,
  };

  return attachment;
}

function extractBodyContent(
  part: gmail_v1.Schema$MessagePart,
  result: IParsedMessageParts,
) {
  const mimeType = part.mimeType || '';
  const body = part.body;

  if (!body?.data) {
    return;
  }

  const decodedContent = decodeBase64Url(body.data);

  if (mimeType === 'text/html') {
    // Nếu chưa có HTML body hoặc part này dài hơn
    if (!result.htmlBody || decodedContent.length > result.htmlBody.length) {
      result.htmlBody = decodedContent;
    }
  } else if (mimeType === 'text/plain') {
    // Nếu chưa có text body hoặc part này dài hơn
    if (!result.textBody || decodedContent.length > result.textBody.length) {
      result.textBody = decodedContent;
    }
  }
}

export function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');

    let decoded = Buffer.from(base64, 'base64').toString('utf-8');

    decoded = unescapeHtml(decoded);

    return decoded;
  } catch (error) {
    console.error('Failed to decode base64url:', error);
    return '';
  }
}

function unescapeHtml(text: string): string {
  const unescaped = text
    .replace(/\\"/g, '"') // \" -> "
    .replace(/\\'/g, "'") // \' -> '
    .replace(/\\&/g, '&') // \& -> &
    .replace(/\\</g, '<') // \< -> <
    .replace(/\\>/g, '>') // \> -> >
    .replace(/\\n/g, '\n') // \n -> newline
    .replace(/\\r/g, '\r') // \r -> carriage return
    .replace(/\\t/g, '\t') // \t -> tab
    .replace(/\\\\/g, '\\'); // \\ -> \

  return unescaped;
}

export function hasAttachments(payload?: gmail_v1.Schema$MessagePart) {
  if (!payload) return false;
  return checkPartsForAttachments(payload);
}

function checkPartsForAttachments(part: gmail_v1.Schema$MessagePart): boolean {
  if (isAttachment(part)) {
    return true;
  }

  if (part.parts) {
    return part.parts.some((childPart) => checkPartsForAttachments(childPart));
  }

  return false;
}
