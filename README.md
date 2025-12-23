# Monicar - NestJS Health Monitoring Library

Production-grade health monitoring for NestJS microservices. Monitor Redis, MySQL, MongoDB, Kafka, HTTP endpoints, and more with type-safe configuration and extensible architecture.

## Features

✅ **Single `/health` endpoint** - Aggregates all dependency health information  
✅ **Configurable intervals** - Set individual check intervals per dependency  
✅ **Strongly typed** - Full TypeScript support with discriminated unions  
✅ **Extensible** - Easy to add new dependency types  
✅ **NestJS idiomatic** - Uses dynamic modules, proper lifecycle hooks  
✅ **Node.js 22 compatible** - Modern JavaScript features  
✅ **Production-ready** - Clean architecture with Strategy, Factory, and Facade patterns

## Installation

```bash
npm install @yourorg/monicar redis mongodb mysql2 kafkajs
```

## Quick Start

```typescript
import { Module }
```

### MySQL

**URI-based configuration:**

```typescript
{
  type: DependencyType.MYSQL,
  name: 'main-db',
  intervalMs: 25000,
  uri: 'mysql://username:password@localhost:3306/mydb',
  timeoutMs: 5000, // optional
}
```

**Host/port configuration:**

```typescript
{
  type: DependencyType.MYSQL,
  name: 'analytics-db',
  intervalMs: 30000,
  host: 'localhost',
  port: 3306,
  username: 'admin', // optional
  password: 'secret', // optional
  database: 'analytics', // optional, defaults to 'mysql'
  ssl: false, // optional, can be boolean or SSL options object
  connectionLimit: 1, // optional, pool size
  timeoutMs: 5000, // optional
}
```

**SSL Configuration:**

```typescript
{
  type: DependencyType.MYSQL,
  name: 'secure-db',
  intervalMs: 25000,
  host: 'db.example.com',
  port: 3306,
  username: 'admin',
  password: 'secret',
  database: 'production',
  ssl: {
    ca: fs.readFileSync('/path/to/ca.pem'),
    cert: fs.readFileSync('/path/to/client-cert.pem'),
    key: fs.readFileSync('/path/to/client-key.pem'),
    rejectUnauthorized: true,
  },
  timeoutMs: 5000,
}
```

### HTTP

**Basic configuration:**

```typescript
{
  type: DependencyType.HTTP,
  name: 'external-api',
  intervalMs: 15000,
  url: 'https://api.example.com/health',
  method: 'GET', // optional, defaults to 'GET'
  expectedStatus: 200, // optional, defaults to 200
  timeoutMs: 5000, // optional
}
```

**Advanced configuration:**

```typescript
{
  type: DependencyType.HTTP,
  name: 'api-with-auth',
  intervalMs: 20000,
  url: 'https://api.example.com/health',
  method: 'POST',
  expectedStatus: [200, 201, 204], // Accept multiple status codes
  headers: {
    'Authorization': 'Bearer token123',
    'X-API-Key': 'secret',
  },
  body: {
    check: 'health',
  },
  followRedirects: true, // optional, defaults to true
  validateSSL: true, // optional, defaults to true
  timeoutMs: 5000,
}
```

### Kafka

Kafka health checks support **two levels**:

**🟢 Level 1 - Connectivity (MANDATORY, always enabled):**
- Verifies connection to bootstrap servers
- Fetches cluster metadata
- Returns broker and topic count
- Lightweight and safe for frequent checks

**🟡 Level 2 - Functional (OPTIONAL, user-configured):**
- **Producer Check**: Sends test message to a topic
- **Consumer Check**: Joins consumer group and validates assignment

#### Level 1 Only (Connectivity):

```typescript
{
  type: DependencyType.KAFKA,
  name: 'event-bus',
  intervalMs: 20000,
  brokers: ['localhost:9092', 'localhost:9093'],
  clientId: 'monicar-health', // optional
  timeoutMs: 10000, // optional
}
```

**Response:**
```json
{
  "name": "event-bus",
  "status": "UP",
  "responseTimeMs": 45,
  "metadata": {
    "connectivity": {
      "status": "success",
      "brokers": 2,
      "topics": 15,
      "responseTimeMs": 42
    }
  }
}
```

#### Level 1 + Level 2 (Connectivity + Functional):

```typescript
{
  type: DependencyType.KAFKA,
  name: 'event-bus-full',
  intervalMs: 30000,
  brokers: ['localhost:9092'],
  timeoutMs: 10000,
  functionalChecks: {
    // Producer check
    producer: {
      enabled: true,
      topic: '__monicar_health_check', // Dedicated health check topic
      message: { timestamp: Date.now(), check: 'health' }, // Optional, defaults to string
      acks: -1, // Optional: -1 (all), 0 (none), 1 (leader only)
      compressionType: 'gzip', // Optional: 'none' | 'gzip' | 'snappy' | 'lz4' | 'zstd'
    },
    // Consumer check
    consumer: {
      enabled: true,
      groupId: 'monicar-health-check-group',
      topic: '__monicar_health_check',
      sessionTimeout: 30000, // Optional
    },
  },
}
```

**Response with Functional Checks:**
```json
{
  "name": "event-bus-full",
  "status": "UP",
  "responseTimeMs": 156,
  "metadata": {
    "connectivity": {
      "status": "success",
      "brokers": 1,
      "topics": 8,
      "responseTimeMs": 38
    },
    "functional": {
      "producer": {
        "status": "success",
        "responseTimeMs": 67
      },
      "consumer": {
        "status": "success",
        "responseTimeMs": 51
      }
    }
  }
}
```

#### With SASL/SSL Authentication:

```typescript
{
  type: DependencyType.KAFKA,
  name: 'secure-kafka',
  intervalMs: 25000,
  brokers: ['kafka.example.com:9093'],
  clientId: 'monicar-secure',
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca.pem'),
    cert: fs.readFileSync('/path/to/client-cert.pem'),
    key: fs.readFileSync('/path/to/client-key.pem'),
  },
  sasl: {
    mechanism: 'scram-sha-512', // 'plain' | 'scram-sha-256' | 'scram-sha-512'
    username: 'kafka-user',
    password: 'kafka-password',
  },
  connectionTimeout: 10000, // optional
  requestTimeout: 10000, // optional
  timeoutMs: 10000,
  functionalChecks: {
    producer: {
      enabled: true,
      topic: '__monicar_health_check',
    },
  },
}
```

**Important Notes:**
- **Connectivity check always runs**, even without functional checks
- **Create dedicated health check topic** (e.g., `__monicar_health_check`) for producer/consumer checks
- **Producer sends test messages** - ensure topic has retention policy or compaction
- **Consumer doesn't process business data** - only validates group membership
- **Both checks can run independently** - enable only what you need from '@nestjs/common';
import { HealthObserverModule, DependencyType } from '@yourorg/monicar';

@Module({
  imports: [
    HealthObserverModule.forRoot({
      dependencies: [
        {
          type: DependencyType.REDIS,
          name: 'main-redis',
          intervalMs: 10000,
          uri: process.env.REDIS_URL,
        },
        {
          type: DependencyType.MONGODB,
          name: 'main-db',
          intervalMs: 20000,
          uri: process.env.MONGODB_URL,
        },
        {
          type: DependencyType.MYSQL,
          name: 'analytics-db',
          intervalMs: 25000,
          uri: process.env.MYSQL_URL,
        },
        {
          type: DependencyType.HTTP,
          name: 'external-api',
          intervalMs: 15000,
          url: 'https://api.example.com/health',
        },
        {
          type: DependencyType.KAFKA,
          name: 'event-bus',
          intervalMs: 20000,
          brokers: ['localhost:9092'],
        },
      ],
    }),
  ],
})
export class AppModule {}
```

Start your app and access `GET /health`:

```json
{
  "status": "healthy",
  "timestamp": "2025-12-21T10:30:00.000Z",
  "dependencies": [
    {
      "name": "main-redis",
      "status": "UP",
      "responseTimeMs": 12,
      "lastCheckedAt": "2025-12-21T10:29:58.000Z"
    },
    {
      "name": "main-db",
      "status": "UP",
      "responseTimeMs": 18,
      "lastCheckedAt": "2025-12-21T10:29:55.000Z"
    },
    {
      "name": "analytics-db",
      "status": "UP",
      "responseTimeMs": 12,
      "lastCheckedAt": "2025-12-21T10:29:50.000Z"
    },
    {
      "name": "external-api",
      "status": "UP",
      "responseTimeMs": 120,
      "lastCheckedAt": "2025-12-21T10:29:45.000Z"
    },
    {
      "name": "event-bus",
      "status": "UP",
      "responseTimeMs": 45,
      "lastCheckedAt": "2025-12-21T10:29:40.000Z",
      "metadata": {
        "brokers": 1,
        "topics": 15
      }
    }
  ],
  "summary": {
    "total": 5,
    "up": 5,
    "down": 0
  }
}
```

## Configuration

### Redis

### Redis

**URI-based configuration:**

```typescript
{
  type: DependencyType.REDIS,
  name: 'cache',
  intervalMs: 10000,
  uri: 'redis://username:password@localhost:6379/0',
  timeoutMs: 5000, // optional
}
```

### MongoDB

**URI-based configuration:**

```typescript
{
  type: DependencyType.MONGODB,
  name: 'main-db',
  intervalMs: 20000,
  uri: 'mongodb://username:password@localhost:27017/mydb',
  timeoutMs: 5000, // optional
  replicaSetCheck: false, // optional, enables replica set status checks
}
```

**Host/port configuration:**

```typescript
{
  type: DependencyType.MONGODB,
  name: 'replica-set',
  intervalMs: 30000,
  host: 'localhost',
  port: 27017,
  username: 'admin', // optional
  password: 'secret', // optional
  database: 'mydb', // optional, defaults to 'admin'
  authSource: 'admin', // optional
  replicaSet: 'rs0', // optional
  ssl: true, // optional
  timeoutMs: 5000, // optional
  replicaSetCheck: true, // optional, checks replica set health
}
```

**Replica Set Health Checks:**

When `replicaSetCheck: true` is enabled, MongoDB health checks include additional metadata:

```json
{
  "name": "replica-mongodb",
  "status": "UP",
  "responseTimeMs": 22,
  "lastCheckedAt": "2025-12-21T10:29:45.000Z",
  "metadata": {
    "replicaSet": {
      "name": "rs0",
      "isPrimary": true,
      "primaryHost": "localhost:27017",
      "memberCount": 3,
      "healthyMembers": 3
    }
  }
}
```

**Host/port configuration:**

```typescript
{
  type: DependencyType.REDIS,
  name: 'session-store',
  intervalMs: 15000,
  host: 'localhost',
  port: 6379,
  username: 'admin', // optional
  password: 'secret', // optional
  db: 1, // optional
  timeoutMs: 5000, // optional
}
```

## Architecture

The library uses proven design patterns for maintainability and extensibility:

### Strategy Pattern
Each dependency type has its own health check strategy:
- `RedisHealthStrategy` - Uses Redis `PING` command
- `MongodbHealthStrategy` - Uses MongoDB `{ ping: 1 }` command
- `MysqlHealthStrategy` - Uses MySQL `SELECT 1` query with connection pooling
- `HttpHealthStrategy` - HTTP requests with configurable methods, headers, and expected status codes
- `KafkaHealthStrategy` - Kafka admin client with broker/topic metadata fetching
- `KafkaHealthStrategy` (coming soon)

### Factory Pattern
`HealthStrategyFactory` creates the appropriate strategy based on configuration.

### Scheduler Pattern
Each dependency runs on its own interval using `HealthRunner`.

### Registry Pattern
`HealthRegistry` maintains all active health runners.

### Facade Pattern
`MonicarService` provides a simple interface to aggregate all health results.

## Adding New Dependencies

To add support for a new dependency (e.g., PostgreSQL, RabbitMQ):

1. **Add configuration type** in `dependency-config.interface.ts`:

```typescript
export interface PostgresConfig extends BaseDependencyConfig {
  type: DependencyType.POSTGRES;
  host: string;
  port: number;
  database: string;
}

export type DependencyConfig =
  | RedisUriConfig
  | RedisHostConfig
  | PostgresConfig; // Add here
```

2. **Create strategy** implementing `HealthStrategy`:

```typescript
export class PostgresHealthStrategy implements HealthStrategy {
  async check(): Promise<Omit<HealthResult, 'name' | 'lastCheckedAt'>> {
    // Implementation
  }
  
  async cleanup(): Promise<void> {
    // Cleanup
  }
}
```

3. **Register in factory** in `health-strategy.factory.ts`:

```typescript
case DependencyType.POSTGRES:
  return new PostgresHealthStrategy(config);
```

## Health Check Details

### HTTP Health Checks
- Uses native `fetch` API (Node.js 18+)
- Supports all HTTP methods
- Custom headers and request body
- Multiple expected status codes
- Configurable redirect behavior
- Timeout using `AbortController`

### Kafka Health Checks

Kafka health checks are implemented with **two distinct levels**:

#### 🟢 Level 1 - Connectivity (MANDATORY)
- **Always enabled** - runs even without functional checks configured
- Verifies connection to Kafka bootstrap servers
- Fetches cluster metadata (brokers, topics)
- Lightweight and safe for frequent execution
- **Use case**: Basic cluster availability monitoring

#### 🟡 Level 2 - Functional (OPTIONAL)
User can enable either or both:

**Producer Check:**
- Sends a test message to a configured topic
- Waits for acknowledgment (configurable acks)
- Verifies write path is functional
- **Use case**: Ensure producers can publish messages

**Consumer Check:**
- Joins a consumer group
- Subscribes to a topic
- Validates group assignment
- Commits offset (no business data consumption)
- **Use case**: Ensure consumers can read and commit

**Health Status Logic:**
- ✅ **UP**: Connectivity successful + all enabled functional checks pass
- ❌ **DOWN**: Connectivity failed OR any enabled functional check fails

**Response Metadata:**
```typescript
{
  connectivity: {
    status: 'success' | 'failed',
    brokers: number,
    topics: number,
    responseTimeMs: number,
    error?: string,
  },
  functional?: {
    producer?: {
      status: 'success' | 'failed',
      responseTimeMs: number,
      error?: string,
    },
    consumer?: {
      status: 'success' | 'failed',
      responseTimeMs: number,
      error?: string,
    },
  },
}
```

**Best Practices:**
- Use a **dedicated health check topic** (e.g., `__monicar_health_check`)
- Configure topic with **short retention** or **compaction** to avoid unbounded growth
- Use **separate consumer group** for health checks (e.g., `monicar-health-check-group`)
- Enable functional checks only when needed - they're more expensive than connectivity checks
- Run connectivity checks more frequently (10-20s), functional checks less frequently (30-60s)

## API Reference

### HealthResult

```typescript
interface HealthResult {
  name: string;
  status: 'UP' | 'DOWN';
  responseTimeMs: number;
  error?: string;
  lastCheckedAt: string;
}
```

### HealthCheckResult

```typescript
interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  dependencies: HealthResult[];
  summary: {
    total: number;
    up: number;
    down: number;
  };
}
```

## TypeScript Support

All configurations are strongly typed using discriminated unions. Invalid configurations are caught at compile time:

```typescript
// ✅ Valid
{
  type: DependencyType.REDIS,
  intervalMs: 10000,
  uri: 'redis://localhost:6379',
}

// ❌ Compile error - missing required field
{
  type: DependencyType.REDIS,
  intervalMs: 10000,
  // Error: Property 'uri' or 'host' is missing
}

// ❌ Compile error - invalid field for type
{
  type: DependencyType.REDIS,
  intervalMs: 10000,
  uri: 'redis://localhost:6379',
  brokers: ['localhost:9092'], // Error: 'brokers' doesn't exist on Redis config
}
```

## License

MIT

## Contributing

Contributions are welcome! Please ensure:
- Code follows TypeScript strict mode
- New dependencies include full strategy implementation
- Tests are included
- Documentation is updated