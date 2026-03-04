// Shared TypeScript types across the backend

export interface AuthUser {
    userId: string;
    email: string;
}

export type RecurrenceRule = {
    type: 'daily' | 'weekly' | 'monthly';
    days?: number[]; // ISO weekday numbers 1-7
};

export type HabitFrequency = 'DAILY' | 'WEEKLY' | 'SPECIFIC_DAYS';
export type HabitType = 'CHECK' | 'COUNTER';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';
