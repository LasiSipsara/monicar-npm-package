import { HealthStatus } from "./enum";

export interface HealthResult {
  name: string;
  status: 'UP' | 'DOWN';
  responseTimeMs: number;
  error?: string;
  lastCheckedAt: string;
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