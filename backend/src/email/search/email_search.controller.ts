import {
  Body,
  Controller,
  Get,
  Post,
  Query,
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

  @Post('search')
  @ApiSecurity('jwt')
  syncEmails(@Req() req, @Body() searchDto: EmailSearchDto) {
    const userId: number = req.user.sub;
    console.log(searchDto);
    return this.emailSearchService.searchEmails(userId, searchDto);
  }
}
