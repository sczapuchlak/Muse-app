/**
 * The Muse Almanac (#53): types shared by signals, the editorial library, the validator and (later) the selector.
 *
 * Signals are facts computed from canonical records by existing module functions. Entries are the words Muse may use
 * about a signal. The two never mix: signals carry no prose, entries carry no math. See docs/ALMANAC_VOICE.md.
 */

/** ordinary: everyday reading/rituals/tasks. personal: dreams, hydration, private habits. sensitive: mood, body, money. */
export type Sensitivity='ordinary'|'personal'|'sensitive';
export const sensitivityRank:Record<Sensitivity,number>={ordinary:0,personal:1,sensitive:2};

export type AlmanacModule='reading'|'rituals'|'planner'|'wellness'|'mood'|'money'|'nourish'|'dreams'|'tarot'|'cross'|'recap';
export type FactType='count'|'ratio'|'hour'|'seconds'|'date'|'label'|'cents'|'boolean';

/** One fact a signal provides. `label` facts are display names the person chose (a book or ritual title), never free text they wrote. */
export type FactSpec={type:FactType;example:number|string|boolean|null;nullable?:boolean;note?:string};

/** The contract for one signal key: what it means, who computes it, and the facts it carries. */
export type SignalSpec={
 module:AlmanacModule;
 sensitivity:Sensitivity;
 /** Existing function(s) the P1 adapter wraps. The Almanac never recalculates. */
 source:string;
 /** Plain-language condition under which the signal exists (thresholds live in the source function). */
 means:string;
 facts:Record<string,FactSpec>;
 /** Modules whose records are combined (cross-module signals only). */
 crossModule?:AlmanacModule[];
 /** Facts every variant must show (e.g. both sample sizes of a comparison). */
 mustShow?:string[];
};

/** A signal as produced at runtime by an adapter (P1). Never stored. */
export type Signal={
 key:string;module:AlmanacModule;sensitivity:Sensitivity;
 facts:Record<string,number|string|boolean|null>;
 evidence:{sampleSize:number;basis:string;recordIds:string[];range:{start:string;end:string}|null};
 observedOn:string;strength:number;href:string;crossModule?:AlmanacModule[];
};

export type AlmanacFormat='whisper'|'revelation'|'field-note'|'constellation';
export type AlmanacStatus='draft'|'review'|'approved'|'published'|'retired';
export type Tone='wry'|'warm'|'literary'|'playful'|'plain'|'steady';
export type ConditionOp='='|'!='|'>'|'>='|'<'|'<='|'present'|'absent';
/** [fact, op, value]. `present`/`absent` test for null and take no value. */
export type Condition=[string,ConditionOp,(number|string|boolean)?];

/** One section of a long-form variant. A section whose `requires` facts are null, or whose `when` fails, is left out, never filled in. */
export type Section={heading?:string;text:string;requires?:string[];when?:Condition[]};
export type Variant={id:string;title?:string;body:string|Section[]};

export type VariableFormat='count'|'number'|'percent'|'hour'|'duration'|'date'|'label'|'money'|'ordinal';
export type VariableSpec={fact:string;format:VariableFormat;plural?:[string,string]};

export type AlmanacEntry={
 id:string;version:number;status:AlmanacStatus;
 family:string;format:AlmanacFormat;
 trigger:{signal:string;when?:Condition[]};
 sensitivity:Sensitivity;tone:Tone[];
 variants:Variant[];
 variables:Record<string,VariableSpec>;
 prompt?:{text:string;action:'open'|'reflect'|'none'};
 links?:{label:string;href:string}[];
 cooldownDays:number;
 magic?:{kind:'glint'|'starburst'|'constellation';sound?:'reveal'|'confirm'};
 /** Sample facts for validation and the review sheet when the catalog's examples don't fit this entry's conditions. Never real data. */
 sample?:Record<string,number|string|boolean|null>;
 review:{author:string;updatedAt:string;reviewedBy?:string;notes?:string};
};

/** A content file: one family per file. */
export type AlmanacFile={family:string;description:string;voice:string;entries:AlmanacEntry[]};
