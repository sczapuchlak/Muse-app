import type {BookMetadataSource} from '@/lib/books/metadata';
/** Feature-specific contracts. No generic personal-event table or generated history. */
export const whimsyExperiences=['observatory','tarot','side-quests','dreamscapes','fortunes','bookshelf'] as const;
export type WhimsyExperience=typeof whimsyExperiences[number];
export type Owned={id:string;userId:string;revision:number;createdAt:string;updatedAt:string};
export type LocalContext={date:string;timeZone:string};
export type ContentReference={contentId:string;version:number};
export type QuestCategory='Cozy'|'Adventurous'|'Creative'|'Social'|'Chaos Goblin';
export type QuestWeek=Owned&{weekStart:string;timeZone:string;draws:ContentReference[];activeIds?:string[];revealedIds?:string[];chosenSlots?:number[];selectedIds:string[];committedAt?:string;swaps:{from:string;to:ContentReference;at:string}[]};
export type QuestCompletion=Owned&LocalContext&{weekId:string;quest:ContentReference;category:QuestCategory;completedAt:string};
export type TarotReading=Owned&LocalContext&{readAt:string;deckId:string;spreadId:string;cards:{position:number;card:ContentReference;orientation:'upright'|'reversed'}[];reflection:string;question?:string;mood?:string;tags?:string[]};
export type PersonalCardMeaning=Owned&{deckId:string;cardId:string;cardVersion?:number;meaning:string;notes?:string};
export type DreamEntry=Owned&LocalContext&{loggedAt:string;text:string;symbolIds:string[];emotions:string[];interpretation:string;title?:string;classifications?:string[];overallFeeling?:string;intensity?:number;people?:string[];places?:string[];themes?:string[];tags?:string[];notes?:string;recurringKey?:string;lucid?:boolean};
export type FortuneAssignment=Owned&LocalContext&{kind:'cookie'|'oracle'|'prophecy'|'curiosity';content:ContentReference;shownAt?:string;slot?:string;category?:string};
export type SavedDiscovery=Owned&LocalContext&{assignmentId:string;savedAt:string;response?:string;question?:string;note?:string;category?:string;snapshot?:{title:string;body:string;sourceUrl?:string}};
export type Book=Owned&{title:string;author?:string;status:'planned'|'reading'|'finished'|'paused';startedOn?:string;finishedOn?:string;rating?:number;reviewEmojis:string[];genre?:string;coverUrl?:string;format?:'physical'|'ebook'|'audiobook';totalPages?:number;startingPage?:number;currentPage?:number;positionUpdatedAt?:string;positionDate?:string;finalThoughts?:string;isbn?:string;publisher?:string;publishedDate?:string;description?:string;metadataSource?:BookMetadataSource;completions?:BookCompletion[];archivedAt?:string;cycleId?:string;unassignedRating?:number;unassignedReview?:string};
/** One finished read of a book. Rereads add another; the book's finishedOn mirrors the latest. */
/** One finished read. Its id is the read's stable cycle id; rating and review belong to this read only. */
export type BookCompletion={id:string;finishedOn:string;startedOn?:string;recordedAt:string;rating?:number;review?:string};
export type ReadingSession=Owned&{bookId:string;date:string;timeZone:string;pages:number;activeSegments:{start:string;end:string}[];startingPage?:number;endingPage?:number;positionRecordedAt?:string;notes?:string;manual?:boolean;reread?:boolean;cycleId?:string};
export type ReadingGoal=Owned&{period:'day'|'week'|'month'|'year';start:string;end:string;target:number;unit:'minutes'|'pages'|'books';recurs?:boolean};
export type WhimsySources={questWeeks:QuestWeek[];questCompletions:QuestCompletion[];tarot:TarotReading[];dreams:DreamEntry[];fortunes:FortuneAssignment[];saved:SavedDiscovery[];books:Book[];sessions:ReadingSession[]};
export const emptyWhimsySources=():WhimsySources=>({questWeeks:[],questCompletions:[],tarot:[],dreams:[],fortunes:[],saved:[],books:[],sessions:[]});
