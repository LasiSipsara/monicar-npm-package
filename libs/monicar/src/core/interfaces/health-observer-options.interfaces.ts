import { DependencyConfig } from "./configs.interfaces";

export interface HealthObserverModuleOptions {
  dependencies: DependencyConfig[];
  globalTimeoutMs?: number;
}