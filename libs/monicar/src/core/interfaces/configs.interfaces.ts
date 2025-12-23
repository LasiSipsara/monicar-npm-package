import { SslOptions } from "mysql2";
import { DependencyType } from "./enum";


/* ---------- Base Dependency ---------- */
export interface BaseDependencyConfig {
  name?: string;
  intervalMs: number;
  timeoutMs?: number;
}
/* ---------- Redis Configs ---------- */
export interface RedisUriConfig extends BaseDependencyConfig {
  type: DependencyType.REDIS;
  uri: string;
}

export interface RedisHostConfig extends BaseDependencyConfig {
  type: DependencyType.REDIS;
  host: string;
  port: number;
  username?: string;
  password?: string;
  db?: number;
}
export interface MysqlUriConfig extends BaseDependencyConfig {
  type: DependencyType.MYSQL;
  uri: string;
}

export interface MysqlHostConfig extends BaseDependencyConfig {
  type: DependencyType.MYSQL;
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
  ssl?: string | SslOptions
  connectionLimit?: number;
}


export interface MongodbUriConfig extends BaseDependencyConfig {
  type: DependencyType.MONGODB;
  uri: string;
  replicaSetCheck?: boolean;
}

export interface MongodbHostConfig extends BaseDependencyConfig {
  type: DependencyType.MONGODB;
  host: string;
  port: number;
  database?: string;
  username?: string;
  password?: string;
  authSource?: string;
  replicaSet?: string;
  ssl?: boolean;
  replicaSetCheck?: boolean;
}

export interface KafkaProducerCheck {
  enabled: true;
  topic: string;
  message?: string | Record<string, any>;
  acks?: -1 | 0 | 1;
}

export interface KafkaConsumerCheck {
  enabled: true;
  groupId: string;
  topic: string;
  sessionTimeout?: number;
}

export interface KafkaConfig extends BaseDependencyConfig {
  type: DependencyType.KAFKA;
  brokers: string[];
  clientId?: string;
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };
  connectionTimeout?: number;
  requestTimeout?: number;
  functionalChecks?: {
    producer?: KafkaProducerCheck;
    consumer?: KafkaConsumerCheck;
  };
}


export interface HttpConfig extends BaseDependencyConfig {
  type: DependencyType.HTTP;
  url: string;
  method?: 'GET' | 'POST' | 'HEAD' | 'PUT' | 'PATCH' | 'DELETE';
  expectedStatus?: number | number[];
  headers?: Record<string, string>;
  body?: string | Record<string, any>;
  followRedirects?: boolean;
  validateSSL?: boolean;
}


export type DependencyConfig =
  | RedisUriConfig
  | RedisHostConfig
  | MysqlConfig
  | MongodbConfig
  | KafkaConfig
  | HttpConfig;

export type RedisConfig = RedisUriConfig | RedisHostConfig;
export type MongodbConfig = MongodbUriConfig | MongodbHostConfig;
export type MysqlConfig = MysqlUriConfig | MysqlHostConfig;

