import { HealthResult } from "./health-results.interfaces";

export interface HealthRunner {
  start(): void;
  stop(): void;
  getLatestResult(): HealthResult | null;
  cleanup():Promise<void>;
}