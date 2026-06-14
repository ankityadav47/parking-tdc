import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'https://ghostwhite-badger-995775.hostingersite.com',
  webOrigin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  operatorOrigin: process.env.OPERATOR_ORIGIN || 'http://localhost:5174',
  adminOrigin: process.env.ADMIN_ORIGIN || 'http://localhost:5175',
  platformFeePct: parseFloat(process.env.PLATFORM_FEE_PCT || '0.15'),
  taxRate: parseFloat(process.env.TAX_RATE || '0.08'),
  holdExpiryMinutes: parseInt(process.env.HOLD_EXPIRY_MINUTES || '10', 10),
}));

export const authConfig = registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-prod',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-prod',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '30d',
}));

export const razorpayConfig = registerAs('razorpay', () => ({
  keyId: process.env.RAZORPAY_KEY_ID || '',
  keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
}));

export const mapsConfig = registerAs('maps', () => ({
  serverKey: process.env.GOOGLE_MAPS_SERVER_KEY || '',
  browserKey: process.env.VITE_GOOGLE_MAPS_BROWSER_KEY || '',
}));

export const storageConfig = registerAs('storage', () => ({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  bucket: process.env.S3_BUCKET || 'parkspot-media',
  accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
  region: process.env.S3_REGION || 'us-east-1',
  cdnUrl: process.env.CDN_URL || '',
}));

export const emailConfig = registerAs('email', () => ({
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  from: process.env.EMAIL_FROM || 'no-reply@parkspot.app',
  smtpHost: process.env.SMTP_HOST || 'localhost',
  smtpPort: parseInt(process.env.SMTP_PORT || '1025', 10),
}));
