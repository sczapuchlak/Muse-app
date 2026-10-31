/** Readiness is scoped to owners, never inferred from empty arrays or connectivity. */
export type InsightSourceStatus={loaded:boolean;pending?:boolean;saving?:boolean;drafting?:boolean;error?:string};
export function insightAvailability(sources:InsightSourceStatus[]){return {loaded:sources.every(s=>s.loaded),error:sources.some(s=>!!s.error),pending:sources.some(s=>s.pending||s.saving||s.drafting),ready:sources.every(s=>s.loaded&&!s.error&&!s.pending&&!s.saving&&!s.drafting)};}
