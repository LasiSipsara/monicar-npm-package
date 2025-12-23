// src/core/strategies/mongodb/mongodb-health.strategy.ts
import { Injectable } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';
import { HealthStrategy } from '../../interfaces/health-strategy.interface';
import { HealthResult } from '../../interfaces/health-results.interfaces';
import { MongodbConfig } from '../../interfaces/configs.interfaces';


@Injectable()
export class MongodbHealthStrategy implements HealthStrategy {
  private client: MongoClient;
  private db: Db | null = null;
  private readonly timeoutMs: number;
  private readonly replicaSetCheck: boolean;
  private isConnected = false;

  constructor(private readonly config: MongodbConfig) {
    this.timeoutMs = config.timeoutMs || 5000;
    this.replicaSetCheck = config.replicaSetCheck || false;
    this.initializeClient();
  }

  private initializeClient(): void {
    const options: any = {
      serverSelectionTimeoutMS: this.timeoutMs,
      connectTimeoutMS: this.timeoutMs,
      socketTimeoutMS: this.timeoutMs,
      maxPoolSize: 1,
      minPoolSize: 1,
    };

    let connectionString: string;

    if ('uri' in this.config) {
      connectionString = this.config.uri;
    } else {
      const { host, port, username, password, database, authSource, replicaSet, ssl } = this.config;
      
      const auth = username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
      const dbName = database || 'admin';
      
      connectionString = `mongodb://${auth}${host}:${port}/${dbName}`;
      
      const params: string[] = [];
      if (authSource) params.push(`authSource=${authSource}`);
      if (replicaSet) params.push(`replicaSet=${replicaSet}`);
      if (ssl) params.push('ssl=true');
      
      if (params.length > 0) {
        connectionString += '?' + params.join('&');
      }
    }

    this.client = new MongoClient(connectionString, options);
  }

  async check(): Promise<Omit<HealthResult, 'name' | 'lastCheckedAt'>> {
    const startTime = Date.now();

    try {
      if (!this.isConnected) {
        await this.connectWithTimeout();
      }

      if (!this.db) {
        this.db = this.client.db();
      }

      const pingResult = await Promise.race([
        this.db.command({ ping: 1 }),
        this.createTimeoutPromise(),
      ]);

      if (pingResult === 'TIMEOUT') {
        throw new Error(`MongoDB ping timeout after ${this.timeoutMs}ms`);
      }

      if (!pingResult.ok) {
        throw new Error('MongoDB ping returned not ok');
      }

      let additionalChecks: any = {};
      if (this.replicaSetCheck) {
        additionalChecks = await this.performReplicaSetChecks();
      }

      const responseTimeMs = Date.now() - startTime;

      return {
        status: 'UP',
        responseTimeMs,
        ...(Object.keys(additionalChecks).length > 0 && { metadata: additionalChecks }),
      };
    } catch (error) {
      this.isConnected = false;
      const responseTimeMs = Date.now() - startTime;
      
      return {
        status: 'DOWN',
        responseTimeMs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async connectWithTimeout(): Promise<void> {
    const connectResult = await Promise.race([
      this.client.connect(),
      this.createTimeoutPromise(),
    ]);

    if (connectResult === 'TIMEOUT') {
      throw new Error(`MongoDB connection timeout after ${this.timeoutMs}ms`);
    }

    this.isConnected = true;
  }

  private async performReplicaSetChecks(): Promise<any> {
    try {
      if (!this.db) {
        return {};
      }

      const adminDb = this.client.db('admin');
      const status = await adminDb.command({ replSetGetStatus: 1 });

      const primaryMember = status.members?.find((m: any) => m.stateStr === 'PRIMARY');
      
      return {
        replicaSet: {
          name: status.set,
          isPrimary: primaryMember?.self === true,
          primaryHost: primaryMember?.name,
          memberCount: status.members?.length || 0,
          healthyMembers: status.members?.filter((m: any) => m.health === 1).length || 0,
        },
      };
    } catch (error) {
      return {
        replicaSet: {
          error: error instanceof Error ? error.message : 'Failed to get replica set status',
        },
      };
    }
  }

  private createTimeoutPromise(): Promise<'TIMEOUT'> {
    return new Promise((resolve) => {
      setTimeout(() => resolve('TIMEOUT'), this.timeoutMs);
    });
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.close();
        this.isConnected = false;
        this.db = null;
      }
    } catch (error) {
      console.error('Error cleaning up MongoDB client:', error);
      try {
        await this.client.close(true);
      } catch (forceCloseError) {
        console.error('Error force closing MongoDB client:', forceCloseError);
      }
    }
  }
}