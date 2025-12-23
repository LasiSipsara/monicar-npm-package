import { HealthStatus } from "./enum";

export interface HealthResult {
  name: string;
  status: 'UP' | 'DOWN';
  responseTimeMs: number;
  error?: string;
  lastCheckedAt: string;
  metadata?: Record<string, any>;
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  dependencies: HealthResult[];
  summary: {
    total: number;
    up: number;
    down: number;
  };
}

export interface KafkaHealthMetadata {
  connectivity: {
    status: 'success' | 'failed';
    responseTimeMs: number;
    error?: string;
  };
  functional?: {
    producer?: {
      status: 'success' | 'failed';
      responseTimeMs: number;
      error?: string;
    };
    consumer?: {
      status: 'success' | 'failed';
      responseTimeMs: number;
      error?: string;
    };
  };
}