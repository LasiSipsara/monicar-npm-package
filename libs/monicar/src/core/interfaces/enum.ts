export enum DependencyType {
  REDIS = 'REDIS',
  MYSQL = 'MYSQL',
  MONGODB = 'MONGODB',
  KAFKA = 'KAFKA',
  HTTP = 'HTTP',
}
export enum HealthStatus {
    HEALTHY = 'HEALTHY',
    UNHEALTHY = 'UNHEALTHY',
    DEGRADED = 'DEGRADED'
 }