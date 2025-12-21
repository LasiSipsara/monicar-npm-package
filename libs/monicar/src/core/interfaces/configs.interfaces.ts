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
export interface MysqlConfig extends BaseDependencyConfig {
  type: DependencyType.MYSQL;
  uri?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
}

export interface MongodbConfig extends BaseDependencyConfig {
  type: DependencyType.MONGODB;
  uri: string;
}

export interface KafkaConfig extends BaseDependencyConfig {
  type: DependencyType.KAFKA;
  brokers: string[];
  clientId?: string;
}

export interface HttpConfig extends BaseDependencyConfig {
  type: DependencyType.HTTP;
  url: string;
  method?: 'GET' | 'POST' | 'HEAD';
  expectedStatus?: number;
}

export type DependencyConfig =
  | RedisUriConfig
  | RedisHostConfig
  | MysqlConfig
  | MongodbConfig
  | KafkaConfig
  | HttpConfig;

export type RedisConfig = RedisUriConfig | RedisHostConfig;