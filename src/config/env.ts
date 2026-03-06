import dotenv from 'dotenv';
dotenv.config();

// Central config — all env vars validated at startup
export const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
    DIARY_ENCRYPTION_KEY: process.env.DIARY_ENCRYPTION_KEY!,
    API_SECRET: process.env.API_SECRET || 'habitos-secret-key-1234',
    TIMEZONE: 'America/Argentina/Buenos_Aires',
};

const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DIARY_ENCRYPTION_KEY'];
for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}
