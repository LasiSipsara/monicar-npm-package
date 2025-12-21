import { MysqlConfig } from "../../interfaces/configs.interfaces";
import { HealthStrategy } from "../../interfaces/health-strategy.interface";

export class MysqlHealthStrategy implements HealthStrategy {

    constructor(private readonly config: MysqlConfig) {

    }

    async check(): Promise<any> {}
    async cleanup(): Promise<void> {}
}