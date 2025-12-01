import { IsEmail, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmailRecipientDto {
  @ApiProperty({ example: 'recipient@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class ThreadingHeadersDto {
  @ApiPropertyOptional({
    description: 'Message-ID of the original email being replied to',
    example: '<abc123@gmail.com>',
  })
  @IsOptional()
  @IsString()
  inReplyTo?: string;

  @ApiPropertyOptional({
    description: 'References header containing all Message-IDs in the thread',
    example: '<abc123@gmail.com> <def456@gmail.com>',
  })
  @IsOptional()
  @IsString()
  references?: string;
}

export class SendEmailDto {
  @ApiProperty({
    description: 'Recipients (To)',
    type: [String],
    example: ['user1@example.com', 'user2@example.com'],
  })
  @IsArray()
  @IsEmail({}, { each: true })
  to: string[];

  @ApiPropertyOptional({
    description: 'CC recipients',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({
    description: 'BCC recipients',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiProperty({ example: 'Meeting tomorrow' })
  @IsString()
  subject: string;

  @ApiPropertyOptional({
    description: 'Plain text body',
    example: "Hello, let's meet tomorrow at 2pm.",
  })
  @IsOptional()
  @IsString()
  textBody?: string;

  @ApiPropertyOptional({
    description: 'HTML body',
    example: "<div>Hello, let's meet tomorrow at 2pm.</div>",
  })
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiPropertyOptional({
    description: 'Thread ID to send as reply',
    example: '18d8f2a3b4c5d6e7',
  })
  @IsOptional()
  @IsString()
  threadId?: string;

  @ApiPropertyOptional({
    description: 'Binary file attachments',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  files?: Express.Multer.File[];

  @ApiPropertyOptional({
    description: 'Threading headers for proper email threading in Gmail',
    type: ThreadingHeadersDto,
  })
  @IsOptional()
  threadingHeaders?: ThreadingHeadersDto;

  internalAttachments?: AttachmentDto[];
}

export class AttachmentDto {
  filename: string;
  mimeType: string;
  data: string; // base64
}
