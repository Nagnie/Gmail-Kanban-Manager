import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class PinEmailDto {
  @ApiProperty({
    description: 'Column ID (currently only supports inbox)',
    example: 1,
  })
  @IsNumber()
  columnId: number;

  @ApiPropertyOptional({
    description: 'Position within pinned section (0 = top)',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

export class SetPriorityDto {
  @ApiProperty({
    description: 'Priority level (0 = normal, 1 = high, 2 = urgent)',
    example: 1,
    minimum: 0,
    maximum: 2,
  })
  @IsNumber()
  @Min(0)
  priorityLevel: number;
}

export class PinResponseDto {
  @ApiProperty({
    description: 'Email ID',
    example: '18d8f2a3b4c5d6e7',
  })
  emailId: string;

  @ApiProperty({
    description: 'Is pinned',
    example: true,
  })
  isPinned: boolean;

  @ApiProperty({
    description: 'Pinned order',
    example: 0,
  })
  pinnedOrder: number;

  @ApiProperty({
    description: 'Priority level',
    example: 1,
  })
  priorityLevel: number;
}
