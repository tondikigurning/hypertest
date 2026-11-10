export function findFieldValue(obj: unknown, key: string): string | undefined {
    if (obj === null || typeof obj !== "object") return undefined;
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const found = findFieldValue(item, key);
            if (found !== undefined) return found;
        }
        return undefined;
    }
    const record = obj as Record<string, unknown>;
    if (key in record) {
        const val = record[key];
        return val != null ? String(val) : undefined;
    }
    for (const val of Object.values(record)) {
        const found = findFieldValue(val, key);
        if (found !== undefined) return found;
    }
    return undefined;
}

/** Shallow variant — only checks the top-level object keys, no recursion into nested objects. */
export function findFieldValueShallow(obj: unknown, key: string): string | undefined {
    if (obj === null || typeof obj !== "object") return undefined;
    const record = obj as Record<string, unknown>;
    const val = record[key];
    return val != null ? String(val) : undefined;
}

export function parseAriaLabelToISODate(ariaLabel: string): string | null {
    const MONTHS = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    const cleaned = ariaLabel.replace(/^[^,]+,\s*/, "").replace(/(\d+)(st|nd|rd|th)/, "$1");
    const match = cleaned.match(/(\w+)\s+(\d+),\s+(\d{4})/);
    if (!match) return null;
    const monthIdx = MONTHS.indexOf(match[1]);
    if (monthIdx === -1) return null;
    const month = String(monthIdx + 1).padStart(2, "0");
    const day = match[2].padStart(2, "0");
    return `${match[3]}-${month}-${day}`;
}

export function checkDateOrder(
    rows: Array<Record<string, unknown>>,
    field: string,
    direction: "asc" | "desc",
): boolean | null {
    if (rows.length < 2) return null;
    const dates = rows.map((row) => {
        const val = findFieldValueShallow(row, field);
        if (!val) return null;
        const d = new Date(val);
        return Number.isNaN(d.getTime()) ? null : d;
    });
    if (dates.some((d) => d === null)) return null;
    for (let i = 0; i < dates.length - 1; i++) {
        // Equal timestamps are valid regardless of direction
        if (dates[i]!.getTime() === dates[i + 1]!.getTime()) continue;
        if (direction === "asc" && dates[i]!.getTime() > dates[i + 1]!.getTime()) return false;
        if (direction === "desc" && dates[i]!.getTime() < dates[i + 1]!.getTime()) return false;
    }
    return true;
}

export function verifyTextEnumMatch(rows: unknown[], selectedValue: string, filterName: string): boolean | null {
    return (
        rows.length === 0 ||
        rows.every((row) => {
            const fieldValue = findFieldValue(row, filterName);
            if (fieldValue === undefined) return true;
            return fieldValue.toLowerCase().includes(selectedValue.toLowerCase());
        })
    );
}

export function verifyDateMatch(rows: unknown[], selectedValue: string, filterName: string): boolean | null {
    if (rows.length === 0) return true;
    const selectedDate = new Date(selectedValue);
    const rowDates = rows
        .map((row) => {
            const fieldValue = findFieldValue(row, filterName);
            if (!fieldValue) return null;
            const d = new Date(fieldValue);
            return Number.isNaN(d.getTime()) ? null : d;
        })
        .filter((d): d is Date => d !== null);
    if (rowDates.length === 0) return true;
    return rowDates.every((d) => d >= selectedDate) || rowDates.every((d) => d <= selectedDate);
}
