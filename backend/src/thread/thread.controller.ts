import { Body, Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AtGuard } from '../auth/guards/at.guard';
import { ThreadService } from './thread.service';
import { ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { ThreadDetailDto } from './dto/thread-detail.dto';

@Controller('threads')
@UseGuards(AtGuard)
export class ThreadController {
  constructor(private readonly threadService: ThreadService) {}

  @Get('by-labels')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Get threads by labels',
    description: 'Returns list of threads filtered by labels',
  })
  async getThreadsByLabels(@Req() req, @Body('labelIds') labelIds: string[]) {
    console.log(
      '🚀 ~ ThreadController ~ getThreadsByLabels ~ labelIds:',
      labelIds,
    );
    return this.threadService.getThreadsByLabels(
      req.user.email,
      req.user.sub,
      labelIds,
      req.query.q,
    );
  }

  @Get(':id')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Get thread detail with all messages',
    description: 'Returns full conversation thread with all reply messages',
  })
  async getThread(
    @Req() req,
    @Param('id') threadId: string,
  ): Promise<ThreadDetailDto> {
    console.log(req.user);
    return this.threadService.getThreadDetail(req.user.sub, threadId);
  }
}
