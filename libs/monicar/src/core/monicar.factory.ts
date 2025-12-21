// src/core/factories/health-strategy.factory.ts
import { Injectable } from '@nestjs/common';
import { DependencyConfig } from './interfaces/configs.interfaces';
import { DependencyType } from './interfaces/enum';
import { HealthStrategy } from './interfaces/health-strategy.interface';
import { RedisHealthStrategy } from './strategies/redis/redis-health.strategy';
import { MysqlHealthStrategy } from './strategies/mysql/mysql-health.strategy';
import { MongodbHealthStrategy } from './strategies/mongodb/mongodb-health.strategy';
import { KafkaHealthStrategy } from './strategies/kafka/kafka-health.strategy';
import { HttpHealthStrategy } from './strategies/http/http-api-health.strategy';

@Injectable()
export class HealthStrategyFactory {
  createStrategy(config: DependencyConfig): HealthStrategy {
    switch (config.type) {
      case DependencyType.REDIS:
        return new RedisHealthStrategy(config);
      
      case DependencyType.MYSQL:
        return new MysqlHealthStrategy(config);

      case DependencyType.MONGODB:
        return new MongodbHealthStrategy(config);
      
      case DependencyType.KAFKA:
        return new KafkaHealthStrategy(config);

      case DependencyType.HTTP:
        return new HttpHealthStrategy(config);
      
      default:
        const exhaustiveCheck: never = config;
        throw new Error(`Unknown dependency type: ${(exhaustiveCheck as any).type}`);
    }
  }
}