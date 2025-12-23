// src/core/strategies/mysql/mysql-health.strategy.ts
import { Injectable } from '@nestjs/common';
import { HealthStrategy } from '../../interfaces/health-strategy.interface';
import { HealthResult } from '../../interfaces/health-results.interfaces';
import { MysqlConfig } from '../../interfaces/configs.interfaces';
import * as mysql from 'mysql2/promise';

@Injectable()
export class MysqlHealthStrategy implements HealthStrategy {
  private pool: mysql.Pool;
  private readonly timeoutMs: number;

  constructor(private readonly config: MysqlConfig) {
    this.timeoutMs = config.timeoutMs ?? 5000;
    this.initializePool();
  }

  private initializePool(): void {
    const basePoolConfig: mysql.PoolOptions = {
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      connectTimeout: this.timeoutMs,
    };

    if ('uri' in this.config) {
      this.pool = mysql.createPool({
        uri: this.config.uri,
        ...basePoolConfig,
      });
    } else {
      const { host, port, username, password, database, ssl, connectionLimit } =
        this.config;

      const poolOptions: mysql.PoolOptions = {
        host,
        port,
        user: username,
        password,
        database: database ?? 'mysql',
        connectionLimit: connectionLimit ?? 1,
        ssl,
        ...basePoolConfig,
      };

      this.pool = mysql.createPool(poolOptions);
    }
  } 

  async check(): Promise<Omit<HealthResult, 'name' | 'lastCheckedAt'>> {
    const startTime = Date.now();
    let connection: mysql.PoolConnection | null = null;

    try {
      connection = await Promise.race([
        this.pool.getConnection(),
        this.createTimeoutPromise<mysql.PoolConnection>('Connection timeout'),
      ]);

      const [rows] = (await Promise.race([
        connection.execute('SELECT 1 AS health'),
        this.createTimeoutPromise('Query timeout'),
      ])) as any;

      if (!rows || rows[0]?.health !== 1) {
        throw new Error('MySQL health check query returned unexpected result');
      }

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
    } finally {
      connection?.release();
    }
  }

  private createTimeoutPromise<T = never>(message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${message} after ${this.timeoutMs}ms`)),
        this.timeoutMs,
      );
    });
  }

  async cleanup(): Promise<void> {
    try {
      await this.pool.end();
    } catch (error) {
      console.error('Error cleaning up MySQL pool:', error);
    }
  }
}
