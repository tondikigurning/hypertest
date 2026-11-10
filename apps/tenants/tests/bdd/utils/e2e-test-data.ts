const pad = (value: number): string => String(value).padStart(2, "0");

/** Local-time stamp DDMMYYYYHHmm (for example, 271020261108). */
export function e2eTimestamp(date: Date = new Date()): string {
    return [
        pad(date.getDate()),
        pad(date.getMonth() + 1),
        date.getFullYear(),
        pad(date.getHours()),
        pad(date.getMinutes()),
    ].join("");
}

/** `E2E <label> <stamp>` value for identifying records created by a scenario. */
export function e2eValue(label: string, date: Date = new Date()): string {
    return `E2E ${label} ${e2eTimestamp(date)}`;
}
