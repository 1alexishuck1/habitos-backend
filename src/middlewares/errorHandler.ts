import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

// Human-readable labels for Zod field names shown in error messages
const FIELD_LABELS: Record<string, string> = {
    email: 'Email',
    password: 'Contraseña',
    name: 'Nombre',
    title: 'Título',
    category: 'Categoría',
    value: 'Valor',
    status: 'Estado',
    frequencyType: 'Frecuencia',
    frequencyDays: 'Días',
    type: 'Tipo',
    dueDate: 'Fecha límite',
    refreshToken: 'Token',
};

// Centralized error handler — formats Zod validation errors as "Campo: mensaje"
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
    if (err instanceof ZodError) {
        const details = err.flatten().fieldErrors;
        const entries = Object.entries(details);

        const firstMessage = entries.length > 0
            ? (() => {
                const [field, messages] = entries[0];
                const label = FIELD_LABELS[field] ?? field;
                return `${label}: ${messages?.[0]}`;
            })()
            : 'Datos inválidos';

        res.status(400).json({ error: firstMessage, details });
        return;
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Error interno del servidor';

    if (env.NODE_ENV === 'development') {
        console.error(`[Error] ${status} — ${message}`, err.stack);
    }

    res.status(status).json({ error: message });
}

/** Creates an operational error with HTTP status */
export function createError(message: string, status: number): Error & { status: number } {
    const err = new Error(message) as Error & { status: number };
    err.status = status;
    return err;
}
