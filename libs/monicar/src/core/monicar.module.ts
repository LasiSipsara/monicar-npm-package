import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import { MonicarService } from './monicar.service';
import { MonicarController } from './monicar.controller';
import { HealthObserverModuleAsyncOptions, HealthObserverModuleOptions } from './interfaces/health-observer-options.interfaces';
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
      global: true
    };
  }

  static forRootAsync(options: HealthObserverModuleAsyncOptions): DynamicModule{
    const asyncProviders =  this.createAsyncProviders(options);
   return {
    module: HealthObserverModule,
    imports: [...(options.imports || [])],
    controllers: [MonicarController],
    providers:[
     ...asyncProviders,
     HealthRegistry,
     HealthStrategyFactory,
     MonicarService
    ],
    exports: [MonicarService],
    global: true
   }
  }
  static createAsyncProviders(options: HealthObserverModuleAsyncOptions): Provider[] {
    if(options.useFactory) {
      return [
        {
          provide: HEALTH_OBSERVER_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || []
        }
      ]
    }
    return;
    
  }

}