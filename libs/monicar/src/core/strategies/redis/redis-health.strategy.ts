import Redis, { RedisOptions } from 'ioredis';
import { HealthResult } from '../../interfaces/health-results.interfaces';
import { HealthStrategy } from '../../interfaces/health-strategy.interface';
import { RedisConfig } from '../../interfaces/configs.interfaces';
import { Logger } from '@nestjs/common';

export class RedisHealthStrategy implements HealthStrategy {
  private readonly client: Redis;
  private readonly timeoutMs: number;

  constructor(private readonly config: RedisConfig) {
    this.timeoutMs = config.timeoutMs ?? 5000;
    this.client = this.createClient();
  }

  private createClient(): Redis {
    const baseOptions = {
      connectTimeout: this.timeoutMs,
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      retryStrategy: null,

    }
    // URI-based config
    if ('uri' in this.config) {
      return new Redis(this.config.uri, {
        ...baseOptions
      });
    }

    // Host/port-based config
    const options: RedisOptions = {
      host: this.config.host,
      port: this.config.port,
      ...baseOptions
    };

    // OPTIONAL fields (added only if provided)
    if (this.config.username) {
      options.username = this.config.username;
    }

    if (this.config.password) {
      options.password = this.config.password;
    }

    if (typeof this.config.db === 'number') {
      options.db = this.config.db;
    }

    return new Redis(options);
  }

  async check(): Promise<Omit<HealthResult, 'name' | 'lastCheckedAt'>> {
    const startTime = Date.now();
    Logger.log(`Started checking Redis health at: ${new Date(startTime).toISOString()}`);

    try {
      const idleStatuses = ['wait', 'end', 'close'];

      if (idleStatuses.includes(this.client.status)) {
         this.client.connect();
      }

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis Heartbeat Timeout')), 2000)
      );
 
      Logger.log(`Pinging Redis... at ${new Date().toISOString()}`);
      await Promise.race([this.client.ping(), timeout]);

      return {
        status: 'UP',
        responseTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      const timeDetected = Date.now();
      Logger.log(`Redis health check failed at: ${new Date(timeDetected).toISOString()}`);
      Logger.error(`Redis health check error: `, error);
      return {
        status: 'DOWN',
        responseTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
