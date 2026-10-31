/** Format a calendar date without converting it into the browser's time zone. */
export function shortDate(date: string): string {
 const value = new Date(`${date}T12:00:00Z`);
 return Number.isNaN(value.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(value);
}

/** Timestamps are instants; unlike due dates they must be shown in the person's time zone. */
export function shortTimestamp(timestamp:string,timeZone:string):string {
 const value=new Date(timestamp);
 return Number.isNaN(value.getTime())?'Date unavailable':new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone}).format(value);
}
