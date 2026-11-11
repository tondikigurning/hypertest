export type FilterResult = {
    filterTestId: string;
    filterName: string;
    inputType: "text" | "date" | "enum" | "unknown";
    apiStatus: number | null;
    rowCount: number;
    selectedValue: string | null;
    rowsMatchFilter: boolean | null;
};

export type SortResult = {
    sortOptionName: string;
    direction: "asc" | "desc";
    apiStatus: number | null;
    rows: Array<Record<string, unknown>>;
    orderConsistent: boolean | null;
};
