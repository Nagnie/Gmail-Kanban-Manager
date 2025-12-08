import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KanbanColumnId } from './kanban-column.dto';

export class EmailOrderDto {
  @ApiProperty({
    description: 'Email ID',
    example: '18d8f2a3b4c5d6e7',
  })
  @IsString()
  emailId: string;

  @ApiProperty({
    description: 'New order position',
    example: 0,
  })
  @IsNumber()
  order: number;
}

export class ReorderEmailsDto {
  @ApiProperty({
    description: 'Column ID',
    example: 'todo',
  })
  @IsString()
  columnId: KanbanColumnId;

  @ApiProperty({
    description: 'Array of emails with new positions',
    type: [EmailOrderDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailOrderDto)
  emails: EmailOrderDto[];
}

export class ReorderEmailsResponseDto {
  @ApiProperty({
    description: 'Whether the reorder operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description:
      'Message providing additional information about the reorder operation',
    example: 'Reorder successful',
  })
  message: string;
}
