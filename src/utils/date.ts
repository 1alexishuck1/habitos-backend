import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, getISODay } from 'date-fns';

const TZ = 'America/Argentina/Buenos_Aires';

/** Returns today's date string YYYY-MM-DD in ARG timezone */
export function todayInArg(): string {
    return formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
}

/** Converts a UTC Date (as returned by Prisma for @db.Date) to a plain date string YYYY-MM-DD */
export function toArgDate(date: Date): string {
    // Prisma returns DATE columns as UTC midnight. We want the literal date string.
    return date.toISOString().split('T')[0];
}

/** Formats a full Date object (timestamp) to YYYY-MM-DD in ARG timezone */
export function toArgString(date: Date): string {
    return formatInTimeZone(date, TZ, 'yyyy-MM-dd');
}

/** Returns a Date object representing midnight UTC for a given YYYY-MM-DD (literal) */
export function argDateToUtc(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Use Date.UTC to ensure Prisma saves/queries strictly at 00:00:00 UTC,
    // which aligns best with PostgreSQL's DATE type extraction.
    return new Date(Date.UTC(year, month - 1, day));
}

/** Returns ISO weekday (1=Mon .. 7=Sun) for today in ARG timezone */
export function todayISODay(): number {
    const d = toZonedTime(new Date(), TZ);
    return getISODay(d);
}

/** Returns current hour (0-23) in ARG timezone */
export function currentHourInArg(): number {
    const d = toZonedTime(new Date(), TZ);
    return d.getHours();
}

/** Returns the Monday (start) of the week for a given date string */
export function weekStart(dateStr: string): string {
    const d = argDateToUtc(dateStr);
    const monday = startOfWeek(d, { weekStartsOn: 1 });
    return formatInTimeZone(monday, TZ, 'yyyy-MM-dd');
}

/** Returns the Sunday (end) of the week for a given date string */
export function weekEnd(dateStr: string): string {
    const d = argDateToUtc(dateStr);
    const sunday = endOfWeek(d, { weekStartsOn: 1 });
    return formatInTimeZone(sunday, TZ, 'yyyy-MM-dd');
}

/** Checks if a habit is due on a given ISO weekday based on its frequency config */
export function isDueOnDay(
    frequencyType: string,
    frequencyDays: number[],
    isoWeekday: number
): boolean {
    if (frequencyType === 'DAILY') return true;
    if (frequencyType === 'WEEKLY') return true; // once per week, handled at streak level
    if (frequencyType === 'SPECIFIC_DAYS') return frequencyDays.includes(isoWeekday);
    return false;
}

/** Returns an array of YYYY-MM-DD strings between two dates inclusive */
export function dateRange(from: string, to: string): string[] {
    const result: string[] = [];
    const start = argDateToUtc(from);
    const end = argDateToUtc(to);
    const cur = new Date(start);
    while (cur <= end) {
        result.push(formatInTimeZone(cur, TZ, 'yyyy-MM-dd'));
        cur.setDate(cur.getDate() + 1);
    }
    return result;
}
/** Returns start and end dates for a given period (DAILY, WEEKLY, MONTHLY, YEARLY) based on refDate */
export function getPeriodRange(period: string, refDateStr: string): { from: string; to: string } {
    const d = argDateToUtc(refDateStr);
    let start, end;
    switch (period) {
        case 'DAILY': start = d; end = d; break;
        case 'WEEKLY': start = startOfWeek(d, { weekStartsOn: 1 }); end = endOfWeek(d, { weekStartsOn: 1 }); break;
        case 'MONTHLY': start = startOfMonth(d); end = endOfMonth(d); break;
        case 'YEARLY': start = startOfYear(d); end = endOfYear(d); break;
        default: start = startOfWeek(d, { weekStartsOn: 1 }); end = endOfWeek(d, { weekStartsOn: 1 });
    }
    return {
        from: formatInTimeZone(start, TZ, 'yyyy-MM-dd'),
        to: formatInTimeZone(end, TZ, 'yyyy-MM-dd')
    };
}
