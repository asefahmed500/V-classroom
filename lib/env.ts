import { z } from "zod"

// Environment variable validation schema
const envSchema = z.object({
  // Database
  MONGODB_URI: z.string().min(1, "MongoDB URI is required"),
  MONGO_ROOT_USERNAME: z.string().optional(),
  MONGO_ROOT_PASSWORD: z.string().optional(),
  MONGO_DB_NAME: z.string().default("virtual-study-rooms"),

  // Authentication
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().default(12),

  // AI Integration
  GOOGLE_AI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // Application
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Virtual Study Rooms"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("1.0.0"),

  // Socket.io
  SOCKET_PORT: z.coerce.number().default(3001),
  NEXT_PUBLIC_SOCKET_URL: z.string().default("http://localhost:3000"),

  // Redis
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // File Upload
  UPLOAD_MAX_SIZE: z.coerce.number().default(10485760), // 10MB
  UPLOAD_ALLOWED_TYPES: z.string().default("pdf,doc,docx,txt,png,jpg,jpeg,gif"),
  NEXT_PUBLIC_MAX_FILE_SIZE: z.coerce.number().default(10485760),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // WebRTC
  NEXT_PUBLIC_STUN_SERVERS: z.string().default("stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"),
  NEXT_PUBLIC_TURN_SERVERS: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.coerce.number().default(900000), // 15 minutes

  // Session
  SESSION_SECRET: z.string().min(16, "Session secret must be at least 16 characters").optional(),
  SESSION_MAX_AGE: z.coerce.number().default(604800000), // 7 days

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FILE: z.string().default("logs/app.log"),

  // Monitoring
  NEXT_PUBLIC_ANALYTICS_ID: z.string().optional(),
  SENTRY_DSN: z.string().optional(),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_VIDEO_CHAT: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_AI_ASSISTANT: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_FILE_SHARING: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENABLE_WHITEBOARD: z.coerce.boolean().default(true),

  // Development
  NEXT_PUBLIC_DEBUG_MODE: z.coerce.boolean().default(false),
  NEXT_PUBLIC_SHOW_PERFORMANCE_METRICS: z.coerce.boolean().default(false),

  // Security
  NEXT_PUBLIC_CSP_NONCE: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Database Pool
  DB_MIN_POOL_SIZE: z.coerce.number().default(5),
  DB_MAX_POOL_SIZE: z.coerce.number().default(10),
  DB_MAX_IDLE_TIME: z.coerce.number().default(30000),

  // Cache
  CACHE_TTL: z.coerce.number().default(3600),
  NEXT_PUBLIC_CACHE_ENABLED: z.coerce.boolean().default(true),

  // Backup
  BACKUP_ENABLED: z.coerce.boolean().default(false),
  BACKUP_SCHEDULE: z.string().default("0 2 * * *"),
  BACKUP_RETENTION_DAYS: z.coerce.number().default(30),

  // Health Check
  HEALTH_CHECK_TIMEOUT: z.coerce.number().default(5000),
  HEALTH_CHECK_INTERVAL: z.coerce.number().default(30000),

  // Webhooks
  WEBHOOK_SECRET: z.string().optional(),
  WEBHOOK_TIMEOUT: z.coerce.number().default(10000),
})

// Parse and validate environment variables
function validateEnv() {
  try {
    const env = envSchema.parse(process.env)
    return env
  } catch (error) {
    console.error("❌ Invalid environment variables:")
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`)
      })
    }
    process.exit(1)
  }
}

// Export validated environment variables
export const env = validateEnv()

// Helper functions
export const isDevelopment = env.NODE_ENV === "development"
export const isProduction = env.NODE_ENV === "production"
export const isTest = env.NODE_ENV === "test"

// Feature flags
export const features = {
  videoChat: env.NEXT_PUBLIC_ENABLE_VIDEO_CHAT,
  aiAssistant: env.NEXT_PUBLIC_ENABLE_AI_ASSISTANT,
  fileSharing: env.NEXT_PUBLIC_ENABLE_FILE_SHARING,
  whiteboard: env.NEXT_PUBLIC_ENABLE_WHITEBOARD,
  debugMode: env.NEXT_PUBLIC_DEBUG_MODE,
  performanceMetrics: env.NEXT_PUBLIC_SHOW_PERFORMANCE_METRICS,
}

// Database configuration
export const dbConfig = {
  uri: env.MONGODB_URI,
  minPoolSize: env.DB_MIN_POOL_SIZE,
  maxPoolSize: env.DB_MAX_POOL_SIZE,
  maxIdleTimeMS: env.DB_MAX_IDLE_TIME,
}

// Redis configuration
export const redisConfig = {
  url: env.REDIS_URL,
  password: env.REDIS_PASSWORD,
}

// Email configuration
export const emailConfig = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  user: env.SMTP_USER,
  pass: env.SMTP_PASS,
  from: env.FROM_EMAIL,
}

// WebRTC configuration
export const webrtcConfig = {
  stunServers: env.NEXT_PUBLIC_STUN_SERVERS.split(",").map((url) => ({ urls: url.trim() })),
  turnServers: env.NEXT_PUBLIC_TURN_SERVERS
    ? env.NEXT_PUBLIC_TURN_SERVERS.split(",").map((url) => ({ urls: url.trim() }))
    : [],
}

// Rate limiting configuration
export const rateLimitConfig = {
  max: env.RATE_LIMIT_MAX,
  windowMs: env.RATE_LIMIT_WINDOW,
}

// File upload configuration
export const uploadConfig = {
  maxSize: env.UPLOAD_MAX_SIZE,
  allowedTypes: env.UPLOAD_ALLOWED_TYPES.split(",").map((type) => type.trim()),
}

// Logging configuration
export const logConfig = {
  level: env.LOG_LEVEL,
  file: env.LOG_FILE,
}

// Cache configuration
export const cacheConfig = {
  ttl: env.CACHE_TTL,
  enabled: env.NEXT_PUBLIC_CACHE_ENABLED,
}

// Health check configuration
export const healthConfig = {
  timeout: env.HEALTH_CHECK_TIMEOUT,
  interval: env.HEALTH_CHECK_INTERVAL,
}

// CORS configuration
export const corsConfig = {
  origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
}
