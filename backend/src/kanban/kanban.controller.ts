import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AtGuard } from '../auth/guards/at.guard';
import { KanbanService } from './kanban.service';
import { ApiOperation, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { KanbanColumnId } from './dto/kanban-column.dto';
import { GetColumnQueryDto } from './dto/get-column.dto';
import { MoveEmailDto } from './dto/move-email.dto';
import { BatchMoveEmailDto } from './dto/batch-move-email.dto';

@Controller('emails/kanban')
@UseGuards(AtGuard)
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @Get('columns')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Get all column metadata',
    description: 'Get basic info about all Kanban columns (without emails)',
  })
  getColumnsMetadata() {
    return this.kanbanService.getColumnsMetadata();
  }

  @Get('columns/:columnId')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Get single Kanban column with emails',
    description:
      'Fetch emails for a specific column with filtering and pagination',
  })
  @ApiParam({
    name: 'columnId',
    enum: KanbanColumnId,
  })
  async getColumn(
    @Req() req,
    @Param('columnId') columnId: KanbanColumnId,
    @Query() query: GetColumnQueryDto,
  ) {
    return this.kanbanService.getKanbanColumn(req.user.sub, columnId, query);
  }

  @Post(':emailId/move')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Move email between columns',
  })
  @ApiParam({ name: 'emailId' })
  async moveEmail(
    @Req() req,
    @Param('emailId') emailId: string,
    @Body() moveDto: MoveEmailDto,
  ) {
    return this.kanbanService.moveEmailToColumn(req.user.sub, emailId, moveDto);
  }

  @Post('batch-move')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Batch move multiple emails',
  })
  async batchMoveEmails(@Req() req, @Body() batchDto: BatchMoveEmailDto) {
    return this.kanbanService.batchMoveEmails(req.user.sub, batchDto);
  }
}
