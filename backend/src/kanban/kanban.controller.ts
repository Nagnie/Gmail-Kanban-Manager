import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AtGuard } from '../auth/guards/at.guard';
import { KanbanService } from './kanban.service';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { GetColumnQueryDto } from './dto/get-column.dto';
import { MoveEmailDto } from './dto/move-email.dto';
import { BatchMoveEmailDto } from './dto/batch-move-email.dto';
import { ReorderEmailsDto } from './dto/reorder-email.dto';
import { SnoozeEmailDto } from './dto/snooze-email.dto';
import { PinEmailDto, SetPriorityDto } from 'src/kanban/dto/pin-email.dto';
import {
  BatchSummarizeDto,
  SummarizeEmailDto,
} from 'src/kanban/dto/summarize-email.dto';
import {
  AvailableLabelDto,
  ColumnResponseDto,
  ReorderColumnsDto,
} from 'src/kanban/dto/column-management.dto';
import { CreateColumnDto } from 'src/kanban/dto/create-column.dto';
import { UpdateColumnDto } from 'src/kanban/dto/update-column.dto';

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
  @ApiResponse({
    status: 200,
    description: 'User columns retrieved successfully',
  })
  getColumnsMetadata(@Req() req) {
    return this.kanbanService.getUserColumns(req.user.sub);
  }

  @Get('labels/available')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Get available Gmail labels',
    description: 'Get all Gmail labels that can be used for column assignment',
  })
  @ApiResponse({
    status: 200,
    description: 'Available labels retrieved successfully',
    type: [AvailableLabelDto],
  })
  async getAvailableLabels(@Req() req) {
    return this.kanbanService.getAvailableLabels(req.user.sub);
  }

  @Post('columns')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Create new column',
    description: 'Create a new Kanban column with Gmail label mapping',
  })
  @ApiResponse({
    status: 201,
    description: 'Column created successfully',
    type: ColumnResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or column name already exists',
  })
  async createColumn(@Req() req, @Body() createColumnDto: CreateColumnDto) {
    return this.kanbanService.createColumn(req.user.sub, createColumnDto);
  }

  @Put('columns/reorder')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Reorder columns',
    description: 'Update the display order of multiple columns',
  })
  @ApiResponse({
    status: 200,
    description: 'Columns reordered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  async reorderColumns(@Req() req, @Body() reorderDto: ReorderColumnsDto) {
    return this.kanbanService.reorderColumns(req.user.sub, reorderDto);
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
    description: 'ID of the Kanban column to fetch',
    example: 1,
  })
  async getColumn(
    @Req() req,
    @Param('columnId') columnId: number,
    @Query() query: GetColumnQueryDto,
  ) {
    return this.kanbanService.getKanbanColumn(req.user.sub, columnId, query);
  }

  @Put('columns/:columnId')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Update existing column',
    description: 'Update column name, color, or Gmail label mapping',
  })
  @ApiParam({
    name: 'columnId',
    description: 'Column database ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Column updated successfully',
    type: ColumnResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Column not found',
  })
  async updateColumn(
    @Req() req,
    @Param('columnId', ParseIntPipe) columnId: number,
    @Body() updateColumnDto: UpdateColumnDto,
  ) {
    return this.kanbanService.updateColumn(
      req.user.sub,
      columnId,
      updateColumnDto,
    );
  }

  @Delete('columns/:columnId')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Delete column',
    description: 'Soft delete a column (cannot delete if it contains emails)',
  })
  @ApiParam({
    name: 'columnId',
    description: 'Column database ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Column deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete column (contains emails or is the last column)',
  })
  async deleteColumn(
    @Req() req,
    @Param('columnId', ParseIntPipe) columnId: number,
  ) {
    return this.kanbanService.deleteColumn(req.user.sub, columnId);
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

  @Post('reorder')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Reorder emails within column',
  })
  async reorderEmails(@Req() req, @Body() reorderDto: ReorderEmailsDto) {
    return this.kanbanService.reorderEmails(req.user.sub, reorderDto);
  }

  @Post(':emailId/snooze')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Snooze an email',
  })
  @ApiParam({ name: 'emailId' })
  async snoozeEmail(
    @Req() req,
    @Param('emailId') emailId: string,
    @Body() snoozeDto: SnoozeEmailDto,
  ) {
    return this.kanbanService.snoozeEmail(req.user.sub, emailId, snoozeDto);
  }

  @Get('snoozed')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Get all snoozed emails',
  })
  async getSnoozedEmails(@Req() req) {
    return this.kanbanService.getSnoozedEmails(req.user.sub);
  }

  @Post(':emailId/unsnooze')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Unsnooze an email',
  })
  @ApiParam({ name: 'emailId' })
  async unsnoozeEmail(@Req() req, @Param('emailId') emailId: string) {
    return this.kanbanService.unsnoozeEmail(req.user.sub, emailId);
  }

  @Post(':emailId/pin')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Pin email to top of Inbox',
  })
  @ApiParam({ name: 'emailId' })
  async pinEmail(
    @Req() req,
    @Param('emailId') emailId: string,
    @Body() pinDto: PinEmailDto,
  ) {
    return this.kanbanService.pinEmail(req.user.sub, emailId, pinDto);
  }

  @Delete(':emailId/pin')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Unpin email',
  })
  @ApiParam({ name: 'emailId' })
  async unpinEmail(@Req() req, @Param('emailId') emailId: string) {
    return this.kanbanService.unpinEmail(req.user.sub, emailId);
  }

  @Post(':emailId/priority')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Set email priority level',
  })
  @ApiParam({ name: 'emailId' })
  async setPriority(
    @Req() req,
    @Param('emailId') emailId: string,
    @Body() priorityDto: SetPriorityDto,
  ) {
    return this.kanbanService.setPriority(req.user.sub, emailId, priorityDto);
  }

  @Post(':emailId/summarize')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Generate AI summary for email',
  })
  @ApiParam({ name: 'emailId' })
  async summarizeEmail(
    @Req() req,
    @Param('emailId') emailId: string,
    @Body() dto: SummarizeEmailDto,
  ) {
    return this.kanbanService.summarizeEmail(req.user.sub, emailId, dto);
  }

  @Post('batch-summarize')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Batch summarize multiple emails',
  })
  async batchSummarize(@Req() req, @Body() dto: BatchSummarizeDto) {
    if (dto.emailIds.length > 50) {
      throw new BadRequestException('Maximum 10 emails per batch');
    }

    return this.kanbanService.batchSummarizeEmails(req.user.sub, dto);
  }

  @Get('summary-stats')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Get AI summary usage statistics',
  })
  async getSummaryStats(@Req() req) {
    return this.kanbanService.getSummaryStats(req.user.sub);
  }

  @Delete(':emailId/summary')
  @ApiSecurity('jwt')
  @ApiOperation({
    summary: 'Delete cached summary',
  })
  @ApiParam({ name: 'emailId' })
  async deleteSummary(@Req() req, @Param('emailId') emailId: string) {
    return this.kanbanService.deleteSummary(req.user.sub, emailId);
  }
}
