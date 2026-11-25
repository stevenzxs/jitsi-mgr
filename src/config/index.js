import dotenv from 'dotenv';
dotenv.config();

export default {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || '127.0.0.1',
    trustProxy: process.env.TRUST_PROXY === 'true'
  },
  
  database: {
    type: process.env.DATABASE_TYPE || 'sqlite',
    path: process.env.DATABASE_PATH || './data/jitsi-mgr.db',
    url: process.env.DATABASE_URL
  },
  
  jwt: {
    privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH || './secrets/jwt-private.pem',
    publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH || './secrets/jwt-public.pem',
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '2h',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'cloudmeet-mgr',
    audience: process.env.JWT_AUDIENCE || 'cloudmeet-client',
    algorithm: 'RS256'
  },
  
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900'),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8')
  },
  
  rateLimit: {
    register: {
      max: parseInt(process.env.RATE_LIMIT_REGISTER_MAX || '10'),
      windowMs: parseInt(process.env.RATE_LIMIT_REGISTER_WINDOW || '3600000')
    },
    login: {
      max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '20'),
      windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || '3600000')
    },
    api: {
      max: parseInt(process.env.RATE_LIMIT_API_MAX || '1000'),
      windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW || '3600000')
    }
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};
