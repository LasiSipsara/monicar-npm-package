import Redis, { RedisOptions } from 'ioredis';
import { HealthResult } from '../../interfaces/health-results.interfaces';
import { HealthStrategy } from '../../interfaces/health-strategy.interface';
import { RedisConfig } from '../../interfaces/configs.interfaces';

export class RedisHealthStrategy implements HealthStrategy {
  private readonly client: Redis;
  private readonly timeoutMs: number;

  constructor(private readonly config: RedisConfig) {
    this.timeoutMs = config.timeoutMs ?? 5000;
    this.client = this.createClient();
  }

  private createClient(): Redis {
    // URI-based config
    if ('uri' in this.config) {
      return new Redis(this.config.uri, {
        connectTimeout: this.timeoutMs,
        lazyConnect: true,
      });
    }

    // Host/port-based config
    const options: RedisOptions = {
      host: this.config.host,
      port: this.config.port,
      connectTimeout: this.timeoutMs,
      lazyConnect: true,
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

    try {
      if (this.client.status === 'end') {
        await this.client.connect();
      }

      await this.client.ping();

      return {
        status: 'UP',
        responseTimeMs: Date.now() - startTime,
      };
    } catch (error) {
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
