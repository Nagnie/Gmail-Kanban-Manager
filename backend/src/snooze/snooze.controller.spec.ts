import { Test, TestingModule } from '@nestjs/testing';
import { SnoozeController } from './snooze.controller';

describe('SnoozeController', () => {
  let controller: SnoozeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SnoozeController],
    }).compile();

    controller = module.get<SnoozeController>(SnoozeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
