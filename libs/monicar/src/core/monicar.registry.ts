// src/core/registry/health.registry.ts
import { Injectable } from '@nestjs/common';
import { HealthResult } from './interfaces/health-results.interfaces';
import { HealthRunner } from './interfaces/health-runner.interface';


@Injectable()
export class HealthRegistry {
  private runners = new Map<string, HealthRunner>();

  register(name: string, runner: HealthRunner): void {
    if (this.runners.has(name)) {
      throw new Error(`Health runner with name '${name}' is already registered`);
    }
    this.runners.set(name, runner);
  }

  unregister(name: string): void {
    this.runners.delete(name);
  }

  getRunner(name: string): HealthRunner | undefined {
    return this.runners.get(name);
  }

  getAllRunners(): HealthRunner[] {
    return Array.from(this.runners.values());
  }

  getAllResults(): HealthResult[] {
    const results: HealthResult[] = [];
    
    for (const runner of this.runners.values()) {
      const result = runner.getLatestResult();
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }

  clear(): void {
    this.runners.clear();
  }
}