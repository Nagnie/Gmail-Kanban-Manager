import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmailCardDto {
  @ApiProperty({
    description: 'Email message ID',
    example: '18d8f2a3b4c5d6e7',
  })
  id: string;

  @ApiProperty({
    description: 'Email subject',
    example: 'Q4 Report Review',
  })
  subject: string;

  @ApiProperty({
    description: 'Sender email address',
    example: 'john.doe@example.com',
  })
  from: string;

  @ApiPropertyOptional({
    description: 'Sender display name',
    example: 'John Doe',
  })
  fromName?: string;

  @ApiProperty({
    description: 'Email preview snippet from Gmail',
    example: 'Please review the attached Q4 financial report...',
  })
  snippet: string;

  @ApiPropertyOptional({
    description: 'AI-generated summary (null if not yet summarized)',
    example: 'Request to review Q4 report. Deadline: Friday.',
    nullable: true,
  })
  summary?: string | null;

  @ApiProperty({
    description: 'Whether this email has been summarized',
    example: false,
  })
  hasSummary: boolean;

  @ApiPropertyOptional({
    description: 'When summary was generated',
    example: '2025-12-08T01:30:00Z',
    nullable: true,
  })
  summarizedAt?: string | null;

  @ApiProperty({
    description: 'Email date/time',
    example: '2025-12-08T00:10:00Z',
  })
  date: string;

  @ApiProperty({
    description: 'Whether email has attachments',
    example: true,
  })
  hasAttachments: boolean;

  @ApiPropertyOptional({
    description: 'Number of attachments',
    example: 2,
  })
  attachmentCount?: number;

  @ApiProperty({
    description: 'Whether email is unread',
    example: true,
  })
  isUnread: boolean;

  @ApiProperty({
    description: 'Whether email is starred',
    example: false,
  })
  isStarred: boolean;

  @ApiProperty({
    description: 'Whether email is important',
    example: true,
  })
  isImportant: boolean;

  @ApiProperty({
    description: 'Gmail label IDs',
    example: ['INBOX', 'UNREAD'],
    type: [String],
  })
  labelIds: string[];

  @ApiProperty({
    description: 'Thread ID',
    example: '18d8f2a3b4c5d6e7',
  })
  threadId: string;

  @ApiPropertyOptional({
    description: 'Whether email is pinned',
    example: true,
  })
  isPinned?: boolean;

  @ApiPropertyOptional({
    description: 'Priority level (0 = normal, 1 = high, 2 = urgent)',
    example: 1,
  })
  priorityLevel?: number;
}
