import {
  IsEmail,
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReplyType {
  REPLY = 'reply',
  REPLY_ALL = 'reply_all',
  FORWARD = 'forward',
}

export class AttachmentDto {
  @ApiProperty({ example: 'document.pdf' })
  @IsString()
  filename: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType: string;

  @ApiProperty({
    description: 'Base64 encoded file data',
    example: 'JVBERi0xLjQKJeLjz9MK...',
  })
  @IsString()
  data: string; // base64
}

export class ReplyEmailDto {
  @ApiProperty({
    enum: ReplyType,
    example: ReplyType.REPLY,
    description: 'Type of reply: reply, reply_all, or forward',
  })
  @IsEnum(ReplyType)
  type: ReplyType;

  @ApiPropertyOptional({
    description: 'Additional recipients (for forward or reply_all)',
    type: [String],
    example: ['user1@example.com', 'user2@example.com'],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  to?: string[];

  @ApiPropertyOptional({
    description: 'CC recipients',
    type: [String],
    example: ['cc1@example.com', 'cc2@example.com'],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiPropertyOptional({
    description: 'BCC recipients (hidden from other recipients)',
    type: [String],
    example: ['bcc1@example.com', 'bcc2@example.com'],
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiPropertyOptional({
    description: 'Override subject (for forward)',
    example: 'Fwd: Original Subject',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Plain text body (your reply message)',
    example: 'Thanks for your email. I agree with your points.',
  })
  @IsOptional()
  @IsString()
  textBody?: string;

  @ApiPropertyOptional({
    description: 'HTML body (your reply message)',
    example: '<p>Thanks for your email.</p>',
  })
  @IsOptional()
  @IsString()
  htmlBody?: string;

  @ApiPropertyOptional({
    description: 'Include original attachments (for forward)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeOriginalAttachments?: boolean;

  @ApiPropertyOptional({
    description: 'New binary file attachments to add',
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  files?: Express.Multer.File[];
}
