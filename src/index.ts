import './config/env'; // validates env vars at startup
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { apiGuard } from './middlewares/apiGuard';
import authRoutes from './routes/auth';
import habitRoutes from './routes/habits';
import taskRoutes from './routes/tasks';
import statsRoutes from './routes/stats';
import reflectionRoutes from './routes/reflections';
import friendRoutes from './routes/friends';
import pushRoutes from './routes/push';
import gymRoutes from './routes/gym';

const app = express();

// ─── Global middlewares ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173'],
    credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(apiGuard);

app.use('/auth', authRoutes);
app.use('/habits', habitRoutes);
app.use('/tasks', taskRoutes);
app.use('/stats', statsRoutes);
app.use('/reflections', reflectionRoutes);
app.use('/friends', friendRoutes);
app.use('/push', pushRoutes);
app.use('/gym', gymRoutes);

// ─── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler as any);

app.listen(env.PORT, () => {
    console.log(`[server] running on http://localhost:${env.PORT}`);
});

export default app;
