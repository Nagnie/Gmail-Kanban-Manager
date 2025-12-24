import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  Length,
  IsEnum,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class CreateColumnDto {
  @ApiProperty({ description: 'Column name', example: 'Planning' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiProperty({
    description: 'Label assignment option',
    enum: ['existing', 'new', 'none'],
    example: 'none',
    required: false,
  })
  @IsOptional()
  @IsEnum(['existing', 'new', 'none'])
  labelOption?: 'existing' | 'new' | 'none';

  @ApiProperty({
    description: 'Existing Gmail label ID',
    required: false,
    example: 'Label_123',
  })
  @ValidateIf((o) => o.labelOption === 'existing')
  @IsString()
  @IsNotEmpty({
    message: 'existingLabelId is required when labelOption is existing',
  })
  existingLabelId?: string;

  @ApiProperty({
    description: 'Existing Gmail label name',
    required: false,
    example: 'Important',
  })
  @IsOptional()
  @IsString()
  existingLabelName?: string;

  @ApiProperty({
    description: 'New Gmail label name',
    required: false,
    example: 'Kanban/Planning',
  })
  @ValidateIf((o) => o.labelOption === 'new')
  @IsString()
  @Length(1, 100)
  @IsNotEmpty({
    message: 'newLabelName is required when labelOption is new',
  })
  newLabelName?: string;
}
