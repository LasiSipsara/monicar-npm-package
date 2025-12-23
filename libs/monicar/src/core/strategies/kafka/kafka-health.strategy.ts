// src/core/strategies/kafka/kafka-health.strategy.ts
import { Injectable } from '@nestjs/common';
import { Kafka, Admin, Producer, Consumer, logLevel } from 'kafkajs';
import { HealthStrategy } from '../../interfaces/health-strategy.interface';
import { KafkaConfig } from '../../interfaces/configs.interfaces';
import { HealthResult, KafkaHealthMetadata } from '../../interfaces/health-results.interfaces';


@Injectable()
export class KafkaHealthStrategy implements HealthStrategy {
  private kafka: Kafka;
  private admin: Admin | null = null;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private readonly timeoutMs: number;
  private isAdminConnected = false;
  private isProducerConnected = false;
  private isConsumerConnected = false;

  constructor(private readonly config: KafkaConfig) {
    this.timeoutMs = config.timeoutMs || 10000;
    this.initializeKafka();
  }

  private initializeKafka(): void {
    const kafkaConfig: any = {
      clientId: this.config.clientId || 'monicar-health-check',
      brokers: this.config.brokers,
      connectionTimeout: this.config.connectionTimeout || this.timeoutMs,
      requestTimeout: this.config.requestTimeout || this.timeoutMs,
      logLevel: logLevel.ERROR,
      retry: {
        initialRetryTime: 100,
        retries: 2,
      },
    };

    if (this.config.ssl) {
      kafkaConfig.ssl = typeof this.config.ssl === 'boolean' 
        ? this.config.ssl 
        : {
            rejectUnauthorized: this.config.ssl.rejectUnauthorized !== false,
            ca: this.config.ssl.ca,
            cert: this.config.ssl.cert,
            key: this.config.ssl.key,
          };
    }

    if (this.config.sasl) {
      kafkaConfig.sasl = {
        mechanism: this.config.sasl.mechanism,
        username: this.config.sasl.username,
        password: this.config.sasl.password,
      };
    }

    this.kafka = new Kafka(kafkaConfig);
  }

  async check(): Promise<Omit<HealthResult, 'name' | 'lastCheckedAt'>> {
    const startTime = Date.now();
    const metadata: KafkaHealthMetadata = {
      connectivity: {
        status: 'failed',
        responseTimeMs: 0,
      },
    };

    let overallStatus: 'UP' | 'DOWN' = 'DOWN';
    let overallError: string | undefined;

    try {
      // Level 1: Connectivity Check (MANDATORY - always runs)
      const connectivityResult = await this.checkConnectivity();
      metadata.connectivity = connectivityResult;

      if (connectivityResult.status === 'failed') {
        throw new Error(connectivityResult.error || 'Connectivity check failed');
      }

      overallStatus = 'UP';

      // Level 2: Functional Checks (OPTIONAL - runs if configured)
      if (this.config.functionalChecks) {
        metadata.functional = {};

        const functionalChecks: Promise<void>[] = [];

        if (this.config.functionalChecks.producer?.enabled) {
          functionalChecks.push(
            this.checkProducer().then(result => {
              metadata.functional!.producer = result;
              if (result.status === 'failed') {
                overallStatus = 'DOWN';
                overallError = overallError || result.error;
              }
            })
          );
        }

        if (this.config.functionalChecks.consumer?.enabled) {
          functionalChecks.push(
            this.checkConsumer().then(result => {
              metadata.functional!.consumer = result;
              if (result.status === 'failed') {
                overallStatus = 'DOWN';
                overallError = overallError || result.error;
              }
            })
          );
        }

        await Promise.all(functionalChecks);
      }

      const responseTimeMs = Date.now() - startTime;

      return {
        status: overallStatus,
        responseTimeMs,
        metadata,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      
      return {
        status: 'DOWN',
        responseTimeMs,
        error: error instanceof Error ? error.message : String(error),
        metadata,
      };
    }
  }

  private async checkConnectivity(): Promise<KafkaHealthMetadata['connectivity']> {
    const startTime = Date.now();

    try {
      if (!this.isAdminConnected || !this.admin) {
        await this.connectAdmin();
      }

      if (!this.admin) {
        throw new Error('Kafka admin client not initialized');
      }

      const responseTimeMs = Date.now() - startTime;

      return {
        status: 'success',
        responseTimeMs,
      };
    } catch (error) {
      this.isAdminConnected = false;
      const responseTimeMs = Date.now() - startTime;

      return {
        status: 'failed',
        responseTimeMs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async checkProducer(): Promise<NonNullable<KafkaHealthMetadata['functional']>['producer']> {
    const startTime = Date.now();
    const producerConfig = this.config.functionalChecks?.producer;

    if (!producerConfig?.enabled) {
      return {
        status: 'failed',
        responseTimeMs: 0,
        error: 'Producer check not configured',
      };
    }

    try {
      if (!this.isProducerConnected || !this.producer) {
        await this.connectProducer();
      }

      if (!this.producer) {
        throw new Error('Producer not initialized');
      }

      const message = producerConfig.message || 'monicar-health-check';
      const messageValue = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);

      const sendResult = await Promise.race([
        this.producer.send({
          topic: producerConfig.topic,
          messages: [
            {
              key: 'health-check',
              value: messageValue,
              timestamp: Date.now().toString(),
            },
          ],
          acks: producerConfig.acks ?? -1,
        }),
        this.createTimeoutPromise('Producer send timeout'),
      ]);

      if (sendResult === 'TIMEOUT') {
        throw new Error(`Producer send timeout after ${this.timeoutMs}ms`);
      }

      const responseTimeMs = Date.now() - startTime;

      return {
        status: 'success',
        responseTimeMs,
      };
    } catch (error) {
      this.isProducerConnected = false;
      const responseTimeMs = Date.now() - startTime;

      return {
        status: 'failed',
        responseTimeMs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async checkConsumer(): Promise<NonNullable<KafkaHealthMetadata['functional']>['consumer']> {
    const startTime = Date.now();
    const consumerConfig = this.config.functionalChecks?.consumer;

    if (!consumerConfig?.enabled) {
      return {
        status: 'failed',
        responseTimeMs: 0,
        error: 'Consumer check not configured',
      };
    }

    try {
      if (!this.isConsumerConnected || !this.consumer) {
        await this.connectConsumer();
      }

      if (!this.consumer) {
        throw new Error('Consumer not initialized');
      }

      await Promise.race([
        this.consumer.subscribe({ topic: consumerConfig.topic, fromBeginning: false }),
        this.createTimeoutPromise('Consumer subscribe timeout'),
      ]);

      const runResult = await Promise.race([
        this.runConsumerCheck(),
        this.createTimeoutPromise('Consumer run timeout'),
      ]);

      if (runResult === 'TIMEOUT') {
        throw new Error(`Consumer check timeout after ${this.timeoutMs}ms`);
      }

      const responseTimeMs = Date.now() - startTime;

      return {
        status: 'success',
        responseTimeMs,
      };
    } catch (error) {
      this.isConsumerConnected = false;
      const responseTimeMs = Date.now() - startTime;

      return {
        status: 'failed',
        responseTimeMs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async runConsumerCheck(): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not initialized');
    }

    let resolved = false;

    return new Promise<void>((resolve, reject) => {
      this.consumer!.run({
        eachMessage: async () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        },
      }).catch(reject);

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      }, 2000);
    });
  }

  private async connectAdmin(): Promise<void> {
    if (!this.admin) {
      this.admin = this.kafka.admin();
    }

    const connectResult = await Promise.race([
      this.admin.connect(),
      this.createTimeoutPromise('Admin connection timeout'),
    ]);

    if (connectResult === 'TIMEOUT') {
      throw new Error(`Kafka admin connection timeout after ${this.timeoutMs}ms`);
    }

    this.isAdminConnected = true;
  }

  private async connectProducer(): Promise<void> {
    if (!this.producer) {
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: false,
        transactionTimeout: this.timeoutMs,
      });
    }

    const connectResult = await Promise.race([
      this.producer.connect(),
      this.createTimeoutPromise('Producer connection timeout'),
    ]);

    if (connectResult === 'TIMEOUT') {
      throw new Error(`Kafka producer connection timeout after ${this.timeoutMs}ms`);
    }

    this.isProducerConnected = true;
  }

  private async connectConsumer(): Promise<void> {
    const consumerConfig = this.config.functionalChecks?.consumer;
    
    if (!consumerConfig?.enabled) {
      throw new Error('Consumer check not configured');
    }

    if (!this.consumer) {
      this.consumer = this.kafka.consumer({
        groupId: consumerConfig.groupId,
        sessionTimeout: consumerConfig.sessionTimeout || 30000,
        heartbeatInterval: 3000,
      });
    }

    const connectResult = await Promise.race([
      this.consumer.connect(),
      this.createTimeoutPromise('Consumer connection timeout'),
    ]);

    if (connectResult === 'TIMEOUT') {
      throw new Error(`Kafka consumer connection timeout after ${this.timeoutMs}ms`);
    }

    this.isConsumerConnected = true;
  }

  private createTimeoutPromise(message: string): Promise<'TIMEOUT'> {
    return new Promise((resolve) => {
      setTimeout(() => resolve('TIMEOUT'), this.timeoutMs);
    });
  }

  async cleanup(): Promise<void> {
    const cleanupTasks: Promise<void>[] = [];

    if (this.consumer && this.isConsumerConnected) {
      cleanupTasks.push(
        this.consumer.disconnect().catch(err => {
          console.error('Error disconnecting Kafka consumer:', err);
        })
      );
    }

    if (this.producer && this.isProducerConnected) {
      cleanupTasks.push(
        this.producer.disconnect().catch(err => {
          console.error('Error disconnecting Kafka producer:', err);
        })
      );
    }

    if (this.admin && this.isAdminConnected) {
      cleanupTasks.push(
        this.admin.disconnect().catch(err => {
          console.error('Error disconnecting Kafka admin:', err);
        })
      );
    }

    await Promise.all(cleanupTasks);

    this.isAdminConnected = false;
    this.isProducerConnected = false;
    this.isConsumerConnected = false;
    this.admin = null;
    this.producer = null;
    this.consumer = null;
  }
}