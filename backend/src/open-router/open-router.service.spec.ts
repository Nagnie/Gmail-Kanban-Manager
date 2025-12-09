import { Test, TestingModule } from '@nestjs/testing';
import { OpenRouterServiceService } from './open-router-service.service';

describe('OpenRouterServiceService', () => {
  let service: OpenRouterServiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpenRouterServiceService],
    }).compile();

    service = module.get<OpenRouterServiceService>(OpenRouterServiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
