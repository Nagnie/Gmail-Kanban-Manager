import { ThreadListItemDto } from 'src/thread/dto/thread-list-item.dto';

export class ThreadsListResponseDto {
  nextPageToken?: string;
  resultSizeEstimate?: number;
  threads: ThreadListItemDto[];
}
