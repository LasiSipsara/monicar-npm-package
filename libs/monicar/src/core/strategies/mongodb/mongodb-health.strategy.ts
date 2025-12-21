import { MongodbConfig } from "../../interfaces/configs.interfaces";
import { HealthStrategy } from "../../interfaces/health-strategy.interface";

export class MongodbHealthStrategy implements HealthStrategy {
    constructor(private readonly config: MongodbConfig) {}
    
    async check(): Promise<any> {}
    async cleanup(): Promise<void> {}
}