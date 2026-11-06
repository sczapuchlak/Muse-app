/**
 * Personality badges (#26): hyper-specific, self-selected confessions, never earned, computed or tracked.
 * Kept separate from any future collectible pins. Profiles store badge ids only, so ids never change: an older id
 * whose wording retired is an alias that resolves to its closest current badge.
 */
export type BadgeCategory='books'|'theater'|'creative'|'everyday'|'mystical'|'gaming';
import type {MuseIconName} from '@/components/MuseIcon';
export type ProfileBadge={id:string;label:string;category:BadgeCategory;icon:MuseIconName};

/** Each category's accent is a mid-tone that reads as an outline and as text on light and dark themes. */
export const badgeCategories:{id:BadgeCategory;label:string;accent:string}[]=[
 {id:'books',label:'Books & Fictional Crushes',accent:'#e0559b'},
 {id:'theater',label:'Theater & Entertainment',accent:'#d99a1e'},
 {id:'creative',label:'Creative Pursuits',accent:'#22a58f'},
 {id:'everyday',label:'Pets & Everyday Life',accent:'#ea6f45'},
 {id:'mystical',label:'Mystical & Cosmic',accent:'#8b6cf0'},
 {id:'gaming',label:'Gaming & Personality',accent:'#3b8fe8'},
];

const b=(category:BadgeCategory,...list:[string,string,MuseIconName][]):ProfileBadge[]=>list.map(([id,label,icon])=>({id,label,category,icon}));
export const profileBadges:ProfileBadge[]=[
 ...b('books',
  ['pointy-eared-pretty-boys','I ❤️ Pointy-Eared Pretty Boys','heart'],['one-more-chapter','One More Chapter (Liar)','book'],['fangs-fae-bad-decisions','Fangs, Fae & Bad Decisions','wand'],
  ['romantasy-addict','Romantasy Addict','favorite'],['morally-grey-men','Morally Grey Men','moon'],['white-hair-red-flags','White Hair, Red Flags','flame'],['fictional-men-ruined-me','Fictional Men Ruined Me','heart-pulse'],
  ['enemies-to-lovers','Enemies to Lovers','flame'],['tbr-hoarder','TBR Hoarder','bookshelf'],['spicy-book-club','Spicy Book Club','flame'],['grumpy-sunshine','Grumpy + Sunshine Enthusiast','sun'],
  ['bookworm','Library Card Maxed Out','library'],['judges-covers','Judges Books by Their Covers (Correctly)','bookmark']),
 ...b('theater',
  ['broadway-personality','Broadway Is a Personality Trait','music'],['broadway-boys','Broadway Boy Enthusiast','favorite'],['groff-obsessed','Groff-Obsessed','heart'],
  ['true-crime-comfort','True Crime Is My Comfort Show','television'],['murder-docs-snacks','Murder Documentaries & Snacks','search'],['reality-tv-scholar','Reality TV Scholar','television'],
  ['middle-earth-muse','Middle-Earth Muse','map'],['music-lover','Main-Character Playlist','music'],['film-buff','Stays for the Credits','film'],['comfort-rewatcher','Rewatches the Same Five Shows','television']),
 ...b('creative',
  ['unfinished-hobbies','Collector of Unfinished Hobbies','pin'],['hobby-hoarder','Hobby Hoarder','archive'],['professional-dabbler','Professional Dabbler','brush'],['yarn-stasher','Yarn Stasher','feather'],
  ['maker-of-things','Maker of Things','sparkle'],['project-starter','Project Starter','pen'],['artist','Sketchbook in Every Bag','palette'],['collector','Collector of Pretty Things','gem'],['craft-store-danger','Not Allowed in Craft Stores','shopping']),
 ...b('everyday',
  ['i-love-my-kitties','I Love My Kitties','cat'],['dog-obsessed','Dog Obsessed','paw'],['doordash-address','DoorDash Has My Address','pot'],['tiny-treat-advocate','Tiny Treat Advocate','cake'],
  ['caffeine-dependent','Caffeine Dependent','coffee'],['homebody-deluxe','Homebody Deluxe','home'],['plant-parent','Plant Parent (Some Survived)','leaf'],['baker','Stress Baker','cake'],
  ['always-cold','Always Cold, Always Has a Blanket','sleep'],['cancelled-plans','Cancelled Plans Celebrant','calendar'],['wanderer','Takes the Scenic Route','compass']),
 ...b('mystical',
  ['moon-child','Moon Child','moon'],['night-owl','Night Owl','moon'],['stargazer','Stargazer','orbit'],['dreamer','Dream Journal Keeper','dreams'],
  ['tarot-reader','Pulls a Card Before Every Decision','tarot'],['ritual-keeper','Candle-Lit Everything','flame'],['mercury-retrograde','Blames Mercury Retrograde','planet']),
 ...b('gaming',
  ['side-quest-queen','Side Quest Queen','crown'],['dnd-queen','D&D Queen','crown'],['fandom-hopper','Fandom Hopper','sparkle'],['chronically-online','Chronically Online','laptop'],
  ['professional-yapper','Professional Yapper','mood'],['overthinker','Overthinker','brain'],['adhd-whirlwind','ADHD Whirlwind','wand'],['gamer','Just One More Level','gamepad'],['cozy-gamer','Cozy Game Connoisseur','gamepad']),
];
/** Retired wording kept readable for profiles that chose it before. */
export const badgeAliases:Record<string,string>={'chaos-goblin':'adhd-whirlwind','coffee-fiend':'caffeine-dependent'};
export const MAX_BADGES=6;

export const badgeById=(id:string)=>profileBadges.find(badge=>badge.id===(badgeAliases[id]??id));
export const badgeAccent=(category:BadgeCategory)=>badgeCategories.find(c=>c.id===category)!.accent;
/** Current ids for a stored list: aliases resolve, unknown ids drop, duplicates collapse, at most six. */
export function normalizeBadges(ids:readonly string[]){return [...new Set(ids.map(id=>badgeById(id)?.id).filter((id):id is string=>!!id))].slice(0,MAX_BADGES);}
