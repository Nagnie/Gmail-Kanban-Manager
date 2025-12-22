import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';

export class MoveEmailDto {
  @ApiProperty({
    description: 'Source column ID',
    example: 1,
  })
  @IsNumber()
  sourceColumn: number;

  @ApiProperty({
    description: 'Target column ID',
    example: 2,
  })
  @IsNumber()
  targetColumn: number;

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
    example: 1,
  })
  sourceColumn: number;

  @ApiProperty({
    description: 'Target column ID',
    example: 2,
  })
  targetColumn: number;

  @ApiProperty({
    description: 'Message providing additional info about the move operation',
    example: 'Email moved successfully',
  })
  message: string;
}
