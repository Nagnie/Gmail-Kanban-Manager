import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  Min,
  Max,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class KanbanQueryDto {
  @ApiPropertyOptional({
    description: 'Number of emails per column',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Specific column to fetch',
    example: 'inbox',
  })
  @IsOptional()
  @IsNumber()
  columnId?: number;

  @ApiPropertyOptional({
    description: 'Page token for next page',
    example: 'CAMQAg',
  })
  @IsOptional()
  @IsString()
  pageToken?: string;

  @ApiPropertyOptional({
    description: 'Sort order by date',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

export class KanbanColumnPaginationDto {
  @ApiProperty({
    description: 'Next page token',
    example: 'CAMQAg',
    nullable: true,
  })
  @IsOptional()
  nextPageToken?: string;

  @ApiProperty({
    description: 'Estimated total count',
    example: 150,
  })
  estimatedTotal: number;

  @ApiProperty({
    description: 'Has more emails to load',
    example: true,
  })
  hasMore: boolean;
}
