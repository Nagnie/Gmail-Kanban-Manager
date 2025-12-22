import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmailCardDto } from './email-card.dto';
import { KanbanColumnPaginationDto } from './kanban-pagination.dto';

export class KanbanColumnDto {
  @ApiProperty({
    description: 'Column unique identifier',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Column display name',
    example: 'Inbox',
  })
  name: string;

  @ApiProperty({
    description: 'Gmail label IDs',
    example: ['INBOX'],
    type: [String],
  })
  labelIds: string[];

  @ApiProperty({
    description: 'Number of emails currently loaded',
    example: 20,
  })
  count: number;

  @ApiProperty({
    description: 'Email cards in this column',
    type: [EmailCardDto],
  })
  emails: EmailCardDto[];

  @ApiProperty({
    description: 'Column color',
    example: '#1976d2',
    required: false,
  })
  color?: string;

  @ApiProperty({
    description: 'Column order/position',
    example: 0,
  })
  order: number;

  @ApiPropertyOptional({
    description: 'Pagination info',
    type: KanbanColumnPaginationDto,
  })
  pagination?: KanbanColumnPaginationDto;

  @ApiProperty({
    description: 'Whether emails in this column can be reordered',
    example: false,
  })
  canReorder: boolean;

  @ApiPropertyOptional({
    description: 'Number of pinned emails (Inbox only)',
    example: 3,
  })
  pinnedCount?: number;
}
