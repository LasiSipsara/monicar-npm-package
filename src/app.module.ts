import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthObserverModule } from '@app/monicar';
import { DependencyType } from '@app/monicar/core/interfaces/enum';

@Module({
  imports: [
    HealthObserverModule.forRoot({
      dependencies: [
        // URI-based Redis config
        {
          type: DependencyType.REDIS,
          name: 'main-redis',
          intervalMs: 10000,
          uri: process.env.REDIS_URL || 'redis://localhost:6379',
          timeoutMs: 5000,
        },
        // Host/port-based Redis config
        {
          type: DependencyType.REDIS,
          name: 'cache-redis',
          intervalMs: 15000,
          host: 'localhost',
          port: 6379,
          password: 'secret',
          // db: 1,
        },
      ],
    }),

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
