import { SendEmailDto, AttachmentDto } from '../email/dto/send-email.dto';
import { generateBoundary } from './email-encoder.util';

interface BodyParts {
  textBody?: string;
  htmlBody?: string;
  hasAttachments: boolean;
  hasBothBodies: boolean;
}

export function buildRFC822Message(sendDto: SendEmailDto): string {
  const boundary = generateBoundary();
  const lines: string[] = [];

  // Add headers
  addEmailHeaders(lines, sendDto);
  lines.push('MIME-Version: 1.0');

  // Collect all attachments (from files or internalAttachments)
  const attachments: AttachmentDto[] = [];

  // From binary files (send API)
  if (sendDto.files && sendDto.files.length > 0) {
    for (const file of sendDto.files) {
      attachments.push({
        filename: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        data: file.buffer.toString('base64'),
      });
    }
  }

  // From internal attachments (reply API with original attachments)
  if (sendDto.internalAttachments && sendDto.internalAttachments.length > 0) {
    attachments.push(...sendDto.internalAttachments);
  }

  // Determine message structure
  const bodyParts: BodyParts = {
    textBody: sendDto.textBody,
    htmlBody: sendDto.htmlBody,
    hasAttachments: attachments.length > 0,
    hasBothBodies: !!sendDto.textBody && !!sendDto.htmlBody,
  };

  if (bodyParts.hasAttachments) {
    buildMultipartMixed(lines, boundary, bodyParts, attachments);
  } else if (bodyParts.hasBothBodies) {
    buildMultipartAlternative(lines, boundary, bodyParts);
  } else {
    buildSimpleMessage(lines, bodyParts);
  }

  return lines.join('\r\n');
}

function addEmailHeaders(lines: string[], sendDto: SendEmailDto): void {
  lines.push(`To: ${sendDto.to.join(', ')}`);

  if (sendDto.cc && sendDto.cc.length > 0) {
    lines.push(`Cc: ${sendDto.cc.join(', ')}`);
  }

  if (sendDto.bcc && sendDto.bcc.length > 0) {
    lines.push(`Bcc: ${sendDto.bcc.join(', ')}`);
  }

  lines.push(`Subject: ${sendDto.subject}`);

  // Add threading headers for reply/forward emails
  // These headers ensure Gmail properly threads the conversation
  if (sendDto.threadingHeaders) {
    if (sendDto.threadingHeaders.inReplyTo) {
      lines.push(`In-Reply-To: ${sendDto.threadingHeaders.inReplyTo}`);
    }
    if (sendDto.threadingHeaders.references) {
      lines.push(`References: ${sendDto.threadingHeaders.references}`);
    }
  }
}

function buildMultipartMixed(
  lines: string[],
  boundary: string,
  bodyParts: BodyParts,
  attachments?: AttachmentDto[],
): void {
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  lines.push('');

  // Body part
  if (bodyParts.hasBothBodies) {
    buildMultipartAlternativeSection(lines, boundary, bodyParts);
  } else {
    buildSingleBodySection(lines, boundary, bodyParts);
  }

  // Attachments
  if (attachments && attachments.length > 0) {
    addAttachments(lines, boundary, attachments);
  }

  lines.push(`--${boundary}--`);
}

function buildMultipartAlternative(
  lines: string[],
  boundary: string,
  bodyParts: BodyParts,
): void {
  lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  lines.push('');

  // Text version
  lines.push(`--${boundary}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(bodyParts.textBody!);
  lines.push('');

  // HTML version
  lines.push(`--${boundary}`);
  lines.push('Content-Type: text/html; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(bodyParts.htmlBody!);
  lines.push('');

  lines.push(`--${boundary}--`);
}

function buildMultipartAlternativeSection(
  lines: string[],
  boundary: string,
  bodyParts: BodyParts,
): void {
  const altBoundary = `${boundary}_alt`;

  lines.push(`--${boundary}`);
  lines.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  lines.push('');

  // Text version
  lines.push(`--${altBoundary}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(bodyParts.textBody!);
  lines.push('');

  // HTML version
  lines.push(`--${altBoundary}`);
  lines.push('Content-Type: text/html; charset="UTF-8"');
  lines.push('Content-Transfer-Encoding: 7bit');
  lines.push('');
  lines.push(bodyParts.htmlBody!);
  lines.push('');

  lines.push(`--${altBoundary}--`);
}

function buildSingleBodySection(
  lines: string[],
  boundary: string,
  bodyParts: BodyParts,
): void {
  // When there are attachments, add boundary delimiter
  if (bodyParts.hasAttachments) {
    lines.push(`--${boundary}`);
  }

  if (bodyParts.htmlBody) {
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(bodyParts.htmlBody);
  } else {
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(bodyParts.textBody!);
  }

  // Add blank line after body content when there are attachments
  if (bodyParts.hasAttachments) {
    lines.push('');
  }
}

function buildSimpleMessage(lines: string[], bodyParts: BodyParts): void {
  if (bodyParts.htmlBody) {
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(bodyParts.htmlBody);
  } else {
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('Content-Transfer-Encoding: 7bit');
    lines.push('');
    lines.push(bodyParts.textBody!);
  }
}

function addAttachments(
  lines: string[],
  boundary: string,
  attachments: AttachmentDto[],
): void {
  for (const attachment of attachments) {
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
}
