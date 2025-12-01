import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailSwaggerDto {
  @ApiProperty({
    description: 'Recipients (To)',
    type: [String],
    example: ['recipient1@example.com', 'recipient2@example.com'],
    isArray: true,
  })
  to: string[];

  @ApiPropertyOptional({
    description: 'CC recipients',
    type: [String],
    example: ['cc1@example.com', 'cc2@example.com'],
    isArray: true,
  })
  cc?: string[];

  @ApiPropertyOptional({
    description: 'BCC recipients',
    type: [String],
    example: ['bcc1@example.com', 'bcc2@example.com'],
    isArray: true,
  })
  bcc?: string[];

  @ApiProperty({
    description: 'Email subject',
    example: 'Q4 Report - Review Required',
  })
  subject: string;

  @ApiPropertyOptional({
    description: 'Plain text body (at least textBody or htmlBody required)',
    example: 'Please review the attached Q4 report.',
  })
  textBody?: string;

  @ApiPropertyOptional({
    description: 'HTML body (at least textBody or htmlBody required)',
    example: '<div><h1>Q4 Report</h1><p>Please review.</p></div>',
  })
  htmlBody?: string;

  @ApiPropertyOptional({
    description: 'Thread ID to send as part of existing conversation',
    example: '18d8f2a3b4c5d6e7',
  })
  threadId?: string;

  @ApiPropertyOptional({
    description: 'File attachments (max 10 files, 25MB total)',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  files?: any[];
}
