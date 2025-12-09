import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SummarizeEmailDto {
  @ApiProperty({
    description: 'Gmail message ID to summarize',
  })
  @IsString()
  @IsNotEmpty()
  emailId: string;
}

export class BatchSummarizeEmailDto {
  @ApiProperty({
    description: 'Array of Gmail message IDs to summarize',
  })
  @IsString({ each: true })
  @IsNotEmpty()
  emailIds: string[];
}
