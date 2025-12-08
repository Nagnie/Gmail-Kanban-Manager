import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';
import { KanbanColumnId } from './kanban-column.dto';

export class BatchMoveEmailDto {
  @ApiProperty({
    description: 'Array of email IDs to move',
    example: ['18d8f2a3b4c5d6e7', '18d8f2a3b4c5d6e8'],
    type: [String],
  })
  @IsArray()
  emailIds: string[];

  @ApiProperty({
    description: 'Source column',
    enum: KanbanColumnId,
    example: 'inbox',
  })
  @IsEnum(KanbanColumnId)
  sourceColumn: KanbanColumnId;

  @ApiProperty({
    description: 'Target column',
    enum: KanbanColumnId,
    example: 'done',
  })
  @IsEnum(KanbanColumnId)
  targetColumn: KanbanColumnId;
}

export class BatchMoveEmailResponseDto {
  @ApiProperty({
    description: 'Overall success status of the batch move operation',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of emails successfully moved',
    example: 5,
  })
  moved: number;

  @ApiProperty({
    description: 'Number of emails that failed to move',
    example: 2,
  })
  failed: number;

  @ApiProperty({
    description: 'Detailed results for each email move attempt',
    type: [Object],
  })
  @IsArray()
  results: Array<{ emailId: string; success: boolean; error?: string }>;
}
