/**
 * Stream of Consciousness (#27): shared vocabulary for posts, audiences, reactions and the composer.
 * The database is the authority on every rule here; these lists only drive the interface.
 */
import type {MuseIconName} from '@/components/MuseIcon';
import type {IdentityCard} from '@/lib/social/identity';
import type {ShowcaseDisplay} from '@/lib/profile/adapters';

export type StreamAudience='private'|'friends'|'selected';
export const audienceOptions:{id:StreamAudience;label:string;detail:string}[]=[
 {id:'private',label:'Only me',detail:'Kept on your desk. Nobody else sees it.'},
 {id:'friends',label:'Friends',detail:'Everyone you are friends with right now.'},
 {id:'selected',label:'Selected friends',detail:'Only the friends you pick. New friends never join later.'},
];

export type StreamCategory='reading'|'watching'|'feeling'|'dreaming'|'celebrating'|'tarot'|'side-quests'|'rituals'|'fortunes'|'astrology'|'money';
export type StreamSourceKind='book'|'media'|'mood'|'dream'|'tarot-reading'|'ritual'|'side-quest'|'fortune'|'astrology'|'money-milestone'|'aspiration';
/**
 * Money milestones are no longer offered for new posts (#69). The kind stays so earlier posts keep rendering and can
 * still be edited, unpublished or deleted; the database still accepts it for those posts.
 */
export const retiredKinds:StreamSourceKind[]=['money-milestone'];
/** Composer shortcuts: each accepts only the record types that belong to it (mirrors the database check). */
export const shortcuts:{id:StreamCategory;label:string;icon:MuseIconName;kinds:StreamSourceKind[];home:{href:string;label:string}}[]=[
 {id:'reading',label:'Reading',icon:'book',kinds:['book'],home:{href:'/whimsy/bookshelf',label:'Bookshelf'}},
 {id:'watching',label:'Watching',icon:'film',kinds:['media'],home:{href:'/collections',label:'Collections'}},
 {id:'feeling',label:'Feeling',icon:'mood',kinds:['mood'],home:{href:'/mood',label:'Mood'}},
 {id:'dreaming',label:'Dreaming',icon:'dreams',kinds:['dream'],home:{href:'/whimsy/dreamscapes',label:'Dreamscapes'}},
 {id:'celebrating',label:'Celebrating',icon:'sparkle',kinds:['aspiration','book','ritual','side-quest'],home:{href:'/rituals?view=aspirations',label:'Aspirations'}},
 {id:'tarot',label:'Tarot',icon:'tarot',kinds:['tarot-reading'],home:{href:'/whimsy/tarot',label:'Tarot'}},
 {id:'side-quests',label:'Side Quests',icon:'wand',kinds:['side-quest'],home:{href:'/whimsy/side-quests',label:'Side Quests'}},
 {id:'rituals',label:'Rituals',icon:'rituals',kinds:['ritual'],home:{href:'/rituals',label:'Rituals'}},
 {id:'fortunes',label:'Fortunes',icon:'favorite',kinds:['fortune'],home:{href:'/whimsy/fortunes',label:'Fortunes'}},
 {id:'astrology',label:'Astrology',icon:'orbit',kinds:['astrology'],home:{href:'/whimsy/observatory',label:'Observatory'}},
];
/** The first five are the classic shortcuts; the rest sit behind "More". */
export const primaryShortcutCount=5;
/** Retired categories: earlier posts still find their label and icon; they are never offered for new posts. */
const retiredShortcuts:typeof shortcuts=[{id:'money',label:'Money milestone',icon:'money',kinds:['money-milestone'],home:{href:'/money',label:'Money'}}];
export const shortcutById=(id:string|null|undefined)=>shortcuts.find(s=>s.id===id)??retiredShortcuts.find(s=>s.id===id);
/** The original feed filters. */
export const feedFilters:{id:string|null;label:string}[]=[{id:null,label:'All'},{id:'reading-watching',label:'Reading & Watching'},{id:'life',label:'Life Updates'},{id:'whimsy',label:'Whimsy'},{id:'celebrations',label:'Celebrations'}];

/** Optional decorative flourishes for statuses. Never Wellness moods, never analytics. */
export const decorations:{id:string;emoji:string;label:string}[]=[
 {id:'magical',emoji:'✨',label:'Feeling Magical'},{id:'in-my-feelings',emoji:'☁️',label:'In My Feelings'},{id:'choosing-chaos',emoji:'🔥',label:'Choosing Chaos'},
 {id:'hermit-era',emoji:'🌙',label:'In My Hermit Era'},{id:'thriving',emoji:'💖',label:'Thriving Suspiciously'},
];
export const decorationById=(id:string|null|undefined)=>decorations.find(d=>d.id===id);

export type ReactionId='react'|'love'|'joy'|'cheer'|'celebrate';
/** Each post carries one primary reaction; Comment is always the secondary action. Labels say what giving it means. */
export const reactions:Record<ReactionId,{emoji:string;label:string;given:string;verb:string}>={
 react:{emoji:'✨',label:'React',given:'Reacted',verb:'reacted to'},
 love:{emoji:'💗',label:'Send Love',given:'Love sent',verb:'sent love on'},
 joy:{emoji:'🌼',label:'Share Joy',given:'Joy shared',verb:'shared joy on'},
 cheer:{emoji:'📣',label:'Cheer',given:'Cheered',verb:'cheered'},
 celebrate:{emoji:'🎉',label:'Celebrate',given:'Celebrated',verb:'celebrated'},
};
/** The reaction that suits a post (mirrors the database rule). Moods use their tone; mixed moods stay neutral. */
export function primaryReactionFor(category:StreamCategory|null|undefined,moodTone?:'love'|'joy'|'react'):ReactionId{
 if(category==='feeling')return moodTone??'react';
 if(category==='rituals')return 'cheer';
 if(category==='celebrating'||category==='money')return 'celebrate';
 return 'react';
}
/** Card presentation family: literary, mystical, celebratory, or the classic status. */
export function cardTone(post:{kind:string;category:string|null}):'status'|'literary'|'mystical'|'celebratory'|'feeling'{
 if(post.kind==='status')return 'status';
 if(post.category==='reading'||post.category==='watching')return 'literary';
 if(post.category==='feeling')return 'feeling';
 if(['celebrating','rituals','money'].includes(post.category??''))return 'celebratory';
 return 'mystical';
}

/** Activity headline verbs ("Stephanie is reading…"). */
export function activityVerb(category:string|null|undefined,display:ShowcaseDisplay|null){
 switch(category){
  case 'reading':return display?.progress===100||display?.status==='Finished'?'finished':'is reading';
  case 'watching':return 'is watching';case 'feeling':return 'is feeling';case 'dreaming':return 'dreamt of';
  case 'celebrating':return 'is celebrating';case 'tarot':return 'pulled';case 'side-quests':return 'completed';case 'rituals':return 'is keeping';
  case 'fortunes':return 'saved a fortune:';case 'astrology':return 'is a';case 'money':return 'just';
  default:return 'shared';
 }
}

export type StreamPost={id:string;author:IdentityCard;mine:boolean;kind:'status'|'activity';body:string;decoration:string|null;category:StreamCategory|null;sourceKind:StreamSourceKind|null;
 display:(ShowcaseDisplay&{excerpt?:string})|null;sourceMissing:boolean;spoiler:boolean;createdAt:string;editedAt:string|null;audience?:StreamAudience|null;members?:IdentityCard[]|null;
 primaryReaction:ReactionId;commentsEnabled:boolean;reactionCount:number;reacted:boolean;commentCount:number};
export type StreamComment={id:string;author:IdentityCard;body:string;createdAt:string;editedAt:string|null;mine:boolean;canRemove:boolean};
export type StreamNotification={id:string;kind:'reaction'|'comment'|'friend-request'|'friend-accepted';actor:IdentityCard;postId:string|null;reaction:ReactionId|null;excerpt:string|null;createdAt:string;read:boolean};
export type StreamPreferences={showInNavigation:boolean;reactions:boolean;comments:boolean;friendRequests:boolean;friendAccepted:boolean};
export const reportReasons:{id:'unkind'|'spam'|'private-info'|'other';label:string}[]=[{id:'unkind',label:'Unkind or hurtful'},{id:'spam',label:'Spam'},{id:'private-info',label:'Shares someone’s private information'},{id:'other',label:'Something else'}];

export const BODY_MAX=1000,COMMENT_MAX=1000;

/** "just now", "5 min", "3 h", "yesterday", then a date. The full timestamp is always available alongside. */
export function relativeTime(iso:string,now=Date.now()){
 const seconds=Math.max(0,Math.round((now-new Date(iso).getTime())/1000));
 if(seconds<60)return 'just now';if(seconds<3600)return `${Math.floor(seconds/60)} min ago`;if(seconds<86400)return `${Math.floor(seconds/3600)} h ago`;
 if(seconds<172800)return 'yesterday';
 return new Date(iso).toLocaleDateString(undefined,{month:'short',day:'numeric',...(new Date(iso).getFullYear()!==new Date(now).getFullYear()?{year:'numeric'}:{})});
}
export const fullTime=(iso:string)=>new Date(iso).toLocaleString(undefined,{dateStyle:'full',timeStyle:'short'});
