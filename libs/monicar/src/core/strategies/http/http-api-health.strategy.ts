// src/core/strategies/http/http-health.strategy.ts
import { Injectable } from '@nestjs/common';
import { HealthStrategy } from '../../interfaces/health-strategy.interface';
import { HttpConfig } from '../../interfaces/configs.interfaces';
import { HealthResult } from '../../interfaces/health-results.interfaces';

@Injectable()
export class HttpHealthStrategy implements HealthStrategy {
  private readonly timeoutMs: number;
  private readonly abortController: AbortController;

  constructor(private readonly config: HttpConfig) {
    this.timeoutMs = config.timeoutMs || 5000;
    this.abortController = new AbortController();
  }

  async check(): Promise<Omit<HealthResult, 'name' | 'lastCheckedAt'>> {
    const startTime = Date.now();

    try {
      const method = this.config.method || 'GET';
      const expectedStatus = this.normalizeExpectedStatus(this.config.expectedStatus);

      const timeoutId = setTimeout(() => {
        this.abortController.abort();
      }, this.timeoutMs);

      const requestOptions: RequestInit = {
        method,
        headers: this.buildHeaders(),
        signal: this.abortController.signal,
        redirect: this.config.followRedirects !== false ? 'follow' : 'manual',
      };

      if (this.config.body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        requestOptions.body = typeof this.config.body === 'string' 
          ? this.config.body 
          : JSON.stringify(this.config.body);
      }

      const response = await fetch(this.config.url, requestOptions);
      clearTimeout(timeoutId);

      const responseTimeMs = Date.now() - startTime;

      if (!expectedStatus.includes(response.status)) {
        return {
          status: 'DOWN',
          responseTimeMs,
          error: `Expected status ${expectedStatus.join(' or ')}, got ${response.status}`,
        };
      }

      return {
        status: 'UP',
        responseTimeMs,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          status: 'DOWN',
          responseTimeMs,
          error: `HTTP request timeout after ${this.timeoutMs}ms`,
        };
      }

      return {
        status: 'DOWN',
        responseTimeMs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private buildHeaders(): HeadersInit {
    const headers: HeadersInit = this.config.headers || {};

    if (this.config.body && typeof this.config.body === 'object') {
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    return headers;
  }

  private normalizeExpectedStatus(status?: number | number[]): number[] {
    if (!status) {
      return [200];
    }
    return Array.isArray(status) ? status : [status];
  }

  async cleanup(): Promise<void> {
    try {
      this.abortController.abort();
    } catch (error) {
      console.error('Error cleaning up HTTP strategy:', error);
    }
  }
}