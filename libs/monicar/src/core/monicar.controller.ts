// src/monitor.controller.ts
import { Controller, Get } from '@nestjs/common';
import { MonicarService } from './monicar.service';
import { HealthCheckResult } from './interfaces/health-results.interfaces';

@Controller('health')
export class MonicarController {
  constructor(private readonly monicarService: MonicarService) {}

  @Get()
  getHealth(): HealthCheckResult {
    return this.monicarService.getHealth();
  }
}