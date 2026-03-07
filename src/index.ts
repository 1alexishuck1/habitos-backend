import './config/env'; // validates env vars at startup
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { prisma } from './config/database';
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
import adminRoutes from './routes/admin';
import smokeRoutes from './routes/smoke';
import userRoutes from './routes/userRoutes';
import { ensureAvatarDirectory } from './utils/avatarStorage';

const app = express();

// ─── Global middlewares ───────────────────────────────────────────────────────
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
}));
app.use(cors({
    origin: [env.FRONTEND_URL, 'http://localhost:5173'],
    credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Ensure storage is ready and serve static avatars
const AVATAR_PATH = ensureAvatarDirectory();
app.use('/avatars', express.static(AVATAR_PATH, {
    setHeaders: (res) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

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
app.use('/admin', adminRoutes);
app.use('/smoke', smokeRoutes);
app.use('/users', userRoutes);

// ─── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler as any);

app.listen(env.PORT, () => {
    console.log(`[server] running on http://localhost:${env.PORT}`);

    // ─── Daily DB Cleanup ─────────────────────────────────────────────────────
    // Runs automatically every 24 hours while the server is alive
    setInterval(async () => {
        try {
            console.log('[cleanup] Inciando limpieza de DB diaria...');

            // 1. Eliminar tokens de refresco expirados
            const tokensRes = await prisma.refreshToken.deleteMany({
                where: { expiresAt: { lt: new Date() } }
            });
            console.log(`[cleanup] Eliminados ${tokensRes.count} refresh tokens expirados`);

            // 2. Eliminar mensajes leídos de hace más de 30 días
            const treintaDiasAtras = new Date();
            treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

            const msgsRes = await prisma.friendMessage.deleteMany({
                where: { isRead: true, createdAt: { lt: treintaDiasAtras } }
            });
            console.log(`[cleanup] Eliminados ${msgsRes.count} mensajes viejos leídos`);

            // Se podrían añadir más limpiezas a futuro (notificaciones push obsoletas, etc)
        } catch (error) {
            console.error('[cleanup] Error durante la limpieza:', error);
        }
    }, 24 * 60 * 60 * 1000); // 24 horas

    // Ejecutar limpieza inicial por si el servidor se reinicia seguido
    setTimeout(() => {
        console.log('[cleanup] Ejecutando limpieza inicial de arranque...');
        prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } })
            .then(res => console.log(`[cleanup] Arranque: Eliminados ${res.count} tokens`))
            .catch(() => { });
    }, 10000); // 10 segundos después del arranque
});

export default app;
