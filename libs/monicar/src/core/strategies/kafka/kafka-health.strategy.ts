import { KafkaConfig } from "../../interfaces/configs.interfaces";
import { HealthStrategy } from "../../interfaces/health-strategy.interface";

export class KafkaHealthStrategy implements HealthStrategy {
    constructor(private readonly config: KafkaConfig) {}
    
    async check(): Promise<any> {}
    async cleanup(): Promise<void> {}
}