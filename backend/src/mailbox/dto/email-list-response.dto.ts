import { ThreadListItemDto } from '../../thread/dto/thread-list-item.dto';
import { EmailSummaryDto } from './email-summary.dto';

export class EmailListResponseDto {
  nextPageToken?: string;
  resultSizeEstimate?: number;
  emails: EmailSummaryDto[] | ThreadListItemDto[];
}
