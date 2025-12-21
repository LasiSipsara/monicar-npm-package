import { DynamicModule, Logger, Module } from '@nestjs/common';
import { MonicarService } from './monicar.service';
import { MonicarController } from './monicar.controller';
import { HealthObserverModuleOptions } from './interfaces/health-observer-options.interfaces';
import { HealthStrategyFactory } from './monicar.factory';
import { HealthRegistry } from './monicar.registry';
import { HEALTH_OBSERVER_OPTIONS } from './interfaces/constants';


@Module({})
export class HealthObserverModule {
  static forRoot(options: HealthObserverModuleOptions): DynamicModule {
    return {
      module: HealthObserverModule,
      controllers: [MonicarController],
      providers: [
        {
          provide: HEALTH_OBSERVER_OPTIONS,
          useValue: options,
        },
        HealthRegistry,
        HealthStrategyFactory,
        MonicarService,
      ],
      exports: [MonicarService],
    };
  }
}