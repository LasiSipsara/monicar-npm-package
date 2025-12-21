import { HttpConfig } from "../../interfaces/configs.interfaces";
import { HealthStrategy } from "../../interfaces/health-strategy.interface";

export class HttpHealthStrategy implements HealthStrategy {

  constructor(private readonly config: HttpConfig) {}

  async check(): Promise<any> {}
  async cleanup(): Promise<void> {}
}