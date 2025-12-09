import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { EmailSummaryDto } from 'src/mailbox/dto/email-summary.dto';

export enum SnoozePreset {
  LATER_TODAY = 'later_today',
  TOMORROW = 'tomorrow',
  THIS_WEEKEND = 'this_weekend',
  NEXT_WEEK = 'next_week',
  CUSTOM = 'custom',
}

export class SnoozeEmailDto {
  @ApiProperty({
    description: 'Snooze time preset',
    enum: SnoozePreset,
    example: 'tomorrow',
  })
  @IsEnum(SnoozePreset)
  preset: SnoozePreset;

  @ApiPropertyOptional({
    description: 'Custom date/time (required if preset = custom)',
    example: '2025-12-10T09:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  customDate?: string;
}

export class SnoozeResponseDto {
  @ApiProperty({
    description: 'Snooze record ID',
    example: 123,
  })
  id: number;

  @ApiProperty({
    description: 'Email ID',
    example: '18d8f2a3b4c5d6e7',
  })
  emailId: string;

  @ApiProperty({
    description: 'Email information',
  })
  @IsOptional()
  emailInfo?: EmailSummaryDto;

  @ApiProperty({
    description: 'Original column',
    example: 'inbox',
  })
  originalColumn: string;

  @ApiProperty({
    description: 'Snooze until time',
    example: '2025-12-09T09:00:00Z',
  })
  snoozeUntil: string;

  @ApiProperty({
    description: 'Is restored',
    example: false,
  })
  isRestored: boolean;

  @ApiProperty({
    description: 'Human-readable description',
    example: 'Snoozed until tomorrow at 9:00 AM',
  })
  description: string;
}
