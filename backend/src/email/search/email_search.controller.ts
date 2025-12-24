import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AtGuard } from 'src/auth/guards/at.guard';
import { EmailSearchService } from './email_search.service';
import { EmailSearchDto } from '../dto/search-email.dto';

@Controller('email')
@ApiTags('Emails')
@UseGuards(AtGuard)
export class EmailSearchController {
  constructor(private readonly emailSearchService: EmailSearchService) {}

  @Post('search/fuzzy')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('jwt')
  fuzzySearch(@Req() req, @Body() searchDto: EmailSearchDto) {
    const userId: number = req.user.sub;

    return this.emailSearchService.searchEmails(userId, searchDto);
  }

  @Post('search/semantic')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('jwt')
  semanticSearch(@Req() req, @Body() searchDto: EmailSearchDto) {
    const userId: number = req.user.sub;

    return this.emailSearchService.semanticSearch(
      userId,
      searchDto.query,
      searchDto.limit,
    );
  }
}
