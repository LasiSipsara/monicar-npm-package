import { HealthResult } from "./health-results.interfaces";

export interface HealthStrategy {
  check(): Promise<Omit<HealthResult, 'name' | 'lastCheckedAt'>>;
  cleanup(): Promise<void>;
}