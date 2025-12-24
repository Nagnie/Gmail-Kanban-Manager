import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ColumnOrderDto {
  @ApiProperty({ description: 'Column ID', example: 1 })
  @IsNumber()
  id: number;

  @ApiProperty({ description: 'New order position', example: 0 })
  @IsNumber()
  @Min(0)
  order: number;
}

export class ReorderColumnsDto {
  @ApiProperty({
    description: 'Array of columns with new order',
    type: [ColumnOrderDto],
    example: [
      { id: 1, order: 0 },
      { id: 2, order: 1 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnOrderDto)
  columns: ColumnOrderDto[];
}

export class AvailableLabelDto {
  @ApiProperty({ description: 'Gmail label ID', example: 'Label_123' })
  id: string;

  @ApiProperty({ description: 'Gmail label name', example: 'Important' })
  name: string;

  @ApiProperty({
    description: 'Label type',
    enum: ['system', 'user', 'kanban'],
    example: 'user',
  })
  type: 'system' | 'user' | 'kanban';

  @ApiProperty({
    description: 'Is this a kanban-specific label',
    example: false,
  })
  isKanbanLabel: boolean;

  @ApiProperty({
    description: 'Is this label already assigned to a column',
    example: true,
  })
  isAssigned: boolean;

  @ApiProperty({ description: 'Number of emails with this label', example: 5 })
  emailCount?: number;
}

export class ColumnResponseDto {
  @ApiProperty({ description: 'Column ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Column name', example: 'In Review' })
  name: string;

  @ApiProperty({ description: 'Gmail label ID', example: 'Label_123' })
  gmailLabel: string;

  @ApiProperty({ description: 'Gmail label name', example: 'Kanban/In Review' })
  gmailLabelName: string;

  @ApiProperty({ description: 'Display order', example: 2 })
  order: number;

  @ApiProperty({ description: 'Is active', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Whether this column syncs with Gmail' })
  hasEmailSync: boolean;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;
}
