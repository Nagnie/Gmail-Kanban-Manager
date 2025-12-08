import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class GetColumnQueryDto {
  @ApiPropertyOptional({
    description: 'Number of emails to fetch',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Page token for pagination',
    example: 'CAMQAg',
  })
  @IsOptional()
  @IsString()
  pageToken?: string;

  @ApiPropertyOptional({
    description: 'Search query within column',
    example: 'project deadline',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by sender email',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Filter by has attachments',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasAttachments?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by unread status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isUnread?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by starred status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isStarred?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by important status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isImportant?: boolean;
}
