import { Module } from '@nestjs/common';
import { OpenRouterService } from './open-router.service';

@Module({
  providers: [OpenRouterService],
})
export class OpenRouterModule {}
