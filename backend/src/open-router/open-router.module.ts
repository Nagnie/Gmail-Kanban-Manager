import { Global, Module } from '@nestjs/common';
import { OpenRouterService } from './open-router.service';

@Global()
@Module({
  providers: [OpenRouterService],
  exports: [OpenRouterService],
})
export class OpenRouterModule {}
