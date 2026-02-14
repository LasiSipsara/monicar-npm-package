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
        // URI-based MongoDB config
        {
          type: DependencyType.MONGODB,
          name: 'main-mongodb',
          intervalMs: 20000,
          uri: process.env.MONGODB_URL || 'mongodb://localhost:27017/apollo',
          timeoutMs: 5000,

        },
        // Host/port-based MongoDB config with replica set check
        {
          type: DependencyType.MONGODB,
          name: 'replica-mongodb',
          intervalMs: 30000,
          host: 'localhost',
          port: 27017,
          // username: 'root',
          // password: 'root',
          database: 'admin',
          // authSource: 'admin',
          // replicaSet: 'rs0',
          // replicaSetCheck: true, // Enable replica set status checks
          timeoutMs: 5000,
        },
        {
          type: DependencyType.MYSQL,
          name: 'main-mysql',
          intervalMs: 25000,
          uri: process.env.MYSQL_URL || 'mysql://root:root@localhost:3306/mysql',
          timeoutMs: 5000,
        },
        // MySQL host/port-based config
        {
          type: DependencyType.MYSQL,
          name: 'analytics-mysql',
          intervalMs: 30000,
          host: 'localhost',
          port: 3306,
          username: 'root',
          password: 'root',
          database: 'mysql',
          connectionLimit: 1,
          timeoutMs: 5000,
        },
        {
          type: DependencyType.KAFKA,
          name: 'event-bus-full',
          intervalMs: 30000,
          brokers: ['localhost:9092'],
          timeoutMs: 10000,
          functionalChecks: {
            // Producer check
            producer: {
              enabled: true,
              topic: '__monicar_health_check', // Dedicated health check topic
              message: { timestamp: Date.now(), check: 'health' }, // Optional, defaults to string
              acks: -1, // Optional: -1 (all), 0 (none), 1 (leader only)
            },
            // Consumer check
            consumer: {
              enabled: true,
              groupId: 'monicar-health-check-group',
              topic: '__monicar_health_check',
              sessionTimeout: 30000, // Optional
            },
          },
        }
      ],
    }),

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
