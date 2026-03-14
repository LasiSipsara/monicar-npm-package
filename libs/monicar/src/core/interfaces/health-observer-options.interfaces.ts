import { DependencyConfig } from "./configs.interfaces";

export interface HealthObserverModuleOptions {
  dependencies: DependencyConfig[];
  globalTimeoutMs?: number;
}

export interface HealthObserverModuleAsyncOptions {
  useFactory?: (...args: any[])=>Promise<HealthObserverModuleOptions> | HealthObserverModuleOptions;
  inject?: any[];
  imports?: any[];
}