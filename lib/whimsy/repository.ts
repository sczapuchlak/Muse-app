import type {InsightSourceStatus} from '@/lib/insights/sources';
import type {WhimsyRange} from './integrations';
import type {WhimsySources,QuestWeek,TarotReading,DreamEntry,FortuneAssignment,Book,ReadingSession} from './models';
/** Adapters use authenticated Supabase/RLS, never a caller-supplied owner ID.
 * Failures are unavailable, never empty/saved user history. */
export interface WhimsyReadRepository {
 readRange(range:WhimsyRange):Promise<{sources:WhimsySources;status:InsightSourceStatus}>;
 readQuestWeek(weekStart:string):Promise<QuestWeek|null>;
 readTarotDay(date:string):Promise<TarotReading[]>;
 readDreamDay(date:string):Promise<DreamEntry[]>;
 readFortuneDay(date:string):Promise<FortuneAssignment[]>;
 readCurrentBooks():Promise<Book[]>;
 readReadingSessions(range:WhimsyRange):Promise<ReadingSession[]>;
}
export type WhimsyWriteCommand<T>={commandId:string;expectedRevision:number;record:T};
export type WhimsyWriteResult={revision:number;sourceId:string};
export const whimsyPersistenceStatus={implemented:true,reason:'Feature-specific tables, revision-checked commands and authenticated adapters are implemented locally; full experience UIs remain separate slices.'} as const;
