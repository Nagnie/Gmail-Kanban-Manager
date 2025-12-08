import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsNumber } from 'class-validator';
import { KanbanColumnId } from './kanban-column.dto';

export class MoveEmailDto {
  @ApiProperty({
    description: 'Source column ID',
    enum: KanbanColumnId,
    example: 'inbox',
  })
  @IsEnum(KanbanColumnId)
  sourceColumn: KanbanColumnId;

  @ApiProperty({
    description: 'Target column ID',
    enum: KanbanColumnId,
    example: 'todo',
  })
  @IsEnum(KanbanColumnId)
  targetColumn: KanbanColumnId;

  @ApiProperty({
    description: 'New position in target column',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  targetPosition?: number;
}

export class MoveEmailResponseDto {
  @ApiProperty({
    description: 'Whether the move operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'ID of the moved email',
    example: '18d8f2a3b4c5d6e7',
  })
  emailId: string;

  @ApiProperty({
    description: 'Source column ID',
    example: 'inbox',
  })
  sourceColumn: string;

  @ApiProperty({
    description: 'Target column ID',
    example: 'todo',
  })
  targetColumn: string;

  @ApiProperty({
    description: 'Message providing additional info about the move operation',
    example: 'Email moved successfully',
  })
  message: string;
}
