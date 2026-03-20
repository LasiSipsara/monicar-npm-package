// src/core/runners/health.runner.ts

import { HealthResult } from "./interfaces/health-results.interfaces";
import { HealthRunner } from "./interfaces/health-runner.interface";
import { HealthStrategy } from "./interfaces/health-strategy.interface";

export class MonicarHealthRunner implements HealthRunner {
  private timer: NodeJS.Timeout | null = null;
  private latestResult: HealthResult | null = null;
  private isRunning = false;

  constructor(
    private readonly name: string,
    private readonly strategy: HealthStrategy,
    private readonly intervalMs: number,
  ) { }

  start(): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.runCheck();
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  getLatestResult(): HealthResult | null {
    return this.latestResult;
  }

  private async runCheck(): Promise<void> {
    try {
      const result = await this.strategy.check();
      this.latestResult = {
        name: this.name,
        ...result,
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.latestResult = {
        name: this.name,
        status: 'DOWN',
        responseTimeMs: 0,
        error: error instanceof Error ? error.message : String(error),
        lastCheckedAt: new Date().toISOString(),
      };
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => {
        this.runCheck();
      }, this.intervalMs);
    }
  }

  async cleanup(): Promise<void> {
    this.stop();
    await this.strategy.cleanup();
  }
}