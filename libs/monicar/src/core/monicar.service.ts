// src/monicar.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import { HealthObserverModuleOptions } from './interfaces/health-observer-options.interfaces';
import { HealthCheckResult } from './interfaces/health-results.interfaces';
import { HealthStrategyFactory } from './monicar.factory';
import { HealthRegistry } from './monicar.registry';
import { MonicarHealthRunner } from './monicar.runner';
import { DEFAULT_CHECK_INTERVAL, HEALTH_OBSERVER_OPTIONS } from './interfaces/constants';
import { HealthStatus } from './interfaces/enum';



@Injectable()
export class MonicarService implements OnModuleInit, OnModuleDestroy {
private readonly logger: Logger;
  constructor(
    @Inject(HEALTH_OBSERVER_OPTIONS)
    private readonly options: HealthObserverModuleOptions,
    private readonly registry: HealthRegistry,
    private readonly strategyFactory: HealthStrategyFactory,
  ) {
     this.logger =  new Logger(MonicarService.name)
  }

  async onModuleInit(): Promise<void> {
    this.initializeHealthChecks();
  }

  async onModuleDestroy(): Promise<void> {
    await this.cleanup();
  }

  private initializeHealthChecks(): void {
    this.logger.log(`Initiated health monitoring of ${this.options.dependencies.length} dependancies.`)
    for (const config of this.options.dependencies) {
      const name = config.name || `${config.type.toLowerCase()}-${Date.now()}`;
      const strategy = this.strategyFactory.createStrategy(config);
      const runner = new MonicarHealthRunner(name, strategy, config.intervalMs?? DEFAULT_CHECK_INTERVAL);
      
      this.registry.register(name, runner);
      runner.start();
    }
  }

  getHealth(): HealthCheckResult {
    const dependencies = this.registry.getAllResults();
    
    const summary = {
      total: dependencies.length,
      up: dependencies.filter(d => d.status === 'UP').length,
      down: dependencies.filter(d => d.status === 'DOWN').length,
    };

    let status: HealthStatus;
    if (summary.down === 0) {
      status = HealthStatus.HEALTHY;
    } else if (summary.up === 0) {
      status = HealthStatus.UNHEALTHY;
    } else {
      status = HealthStatus.DEGRADED;
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      dependencies,
      summary,
    };
  }

  private async cleanup(): Promise<void> {
    const runners = this.registry.getAllRunners();
    this.logger.log(`Cleaning up monicar health monitoring runners.`)
    await Promise.all(
      runners.map(runner => runner.cleanup()),
    );
    
    this.registry.clear();
  }
}