import { IsArray, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class BatchModifyEmailDto {
  @ApiPropertyOptional({
    description: 'List of email IDs to modify',
    example: ['emailId1', 'emailId2', 'emailId3'],
  })
  @IsArray()
  @IsOptional()
  ids?: string[];

  @ApiPropertyOptional({
    description: 'List of label IDs to add',
    example: ['STARRED', 'IMPORTANT'],
  })
  @IsOptional()
  @IsArray()
  addLabelIds?: string[];

  @ApiPropertyOptional({
    description: 'List of label IDs to remove',
    example: ['UNREAD', 'INBOX'],
  })
  @IsOptional()
  @IsArray()
  removeLabelIds?: string[];
}
