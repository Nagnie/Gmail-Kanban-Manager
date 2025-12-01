import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReplyType } from './reply-email.dto';

export class ReplyEmailSwaggerDto {
  @ApiProperty({
    description: 'Type of reply action',
    enum: ReplyType,
    example: ReplyType.REPLY,
    enumName: 'ReplyType',
  })
  type: ReplyType;

  @ApiPropertyOptional({
    description: `
- **reply**: Not used (auto-sends to original sender)
- **reply_all**: Optional - Add more recipients  
- **forward**: Required - New recipients
    `,
    type: [String],
    example: ['colleague@example.com', 'manager@example.com'],
    isArray: true,
  })
  to?: string[];

  @ApiPropertyOptional({
    description: 'CC recipients (optional for all types)',
    type: [String],
    example: ['team@example.com'],
    isArray: true,
  })
  cc?: string[];

  @ApiPropertyOptional({
    description: 'BCC recipients (optional for all types)',
    type: [String],
    example: ['archive@company.com'],
    isArray: true,
  })
  bcc?: string[];

  @ApiPropertyOptional({
    description:
      'Custom subject (forward only, auto-generated for reply/reply_all)',
    example: 'Fwd: Important Document - Action Required',
  })
  subject?: string;

  @ApiPropertyOptional({
    description: 'Your reply message (plain text)',
    example: 'Thanks for your email. Please see my comments below.',
  })
  textBody?: string;

  @ApiPropertyOptional({
    description: 'Your reply message (HTML)',
    example: '<div><p>Thanks for your email.</p></div>',
  })
  htmlBody?: string;

  @ApiPropertyOptional({
    description: 'Include original email attachments (forward only)',
    example: true,
    default: false,
  })
  includeOriginalAttachments?: boolean;

  @ApiPropertyOptional({
    description: 'New file attachments to add (max 10 files, 25MB total)',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  files?: any[];
}
