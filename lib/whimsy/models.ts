/** Feature-specific contracts. No generic personal-event table or generated history. */
export const whimsyExperiences=['side-quests','tarot','dreamscapes','fortunes','bookshelf'] as const;
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
export type FortuneAssignment=Owned&LocalContext&{kind:'cookie'|'oracle'|'prophecy'|'curiosity';content:ContentReference;shownAt?:string};
export type SavedDiscovery=Owned&LocalContext&{assignmentId:string;savedAt:string;response?:string};
export type Book=Owned&{title:string;author?:string;status:'planned'|'reading'|'finished'|'paused';startedOn?:string;finishedOn?:string;rating?:number;reviewEmojis:string[]};
export type ReadingSession=Owned&{bookId:string;date:string;timeZone:string;pages:number;activeSegments:{start:string;end:string}[]};
export type ReadingGoal=Owned&{period:'week'|'month'|'year';start:string;end:string;target:number;unit:'minutes'|'pages'|'books'};
export type WhimsySources={questWeeks:QuestWeek[];questCompletions:QuestCompletion[];tarot:TarotReading[];dreams:DreamEntry[];fortunes:FortuneAssignment[];saved:SavedDiscovery[];books:Book[];sessions:ReadingSession[]};
export const emptyWhimsySources=():WhimsySources=>({questWeeks:[],questCompletions:[],tarot:[],dreams:[],fortunes:[],saved:[],books:[],sessions:[]});
