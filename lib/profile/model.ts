/** Personal Profiles & Showcase Studio (#26): profile shape, sections, badges, layouts and starter ideas. */
import type {MuseIconName} from '@/components/MuseIcon';
import type {ThemeId} from '@/lib/themes';
import {isThemeId} from '@/lib/themes';

export type SectionId='about'|'badges'|'showcases';
export type ProfileSection={id:SectionId;hidden:boolean};
export const sectionLabels:Record<SectionId,string>={about:'About me',badges:'Badges',showcases:'Showcases'};
export const defaultSections:ProfileSection[]=[{id:'about',hidden:false},{id:'badges',hidden:false},{id:'showcases',hidden:false}];
export function normalizeSections(value:unknown):ProfileSection[]{
 const list=Array.isArray(value)?value:[];const seen=new Set<SectionId>();const out:ProfileSection[]=[];
 for(const entry of list){const id=(entry as ProfileSection)?.id;if(id&&id in sectionLabels&&!seen.has(id)){seen.add(id);out.push({id,hidden:!!(entry as ProfileSection).hidden});}}
 for(const section of defaultSections)if(!seen.has(section.id))out.push(section);
 return out;
}

export type ProfileVisibility='private'|'friends';
export type ProfileDetails={tagline:string;bio:string;bannerGradient:string;theme:ThemeId;sections:ProfileSection[];badges:string[];visibility:ProfileVisibility};

export {profileBadges,MAX_BADGES} from './badges';

export type ShowcaseLayout='gallery'|'shelf'|'spotlight'|'cards'|'mixed';
export const showcaseLayouts:{id:ShowcaseLayout;label:string;description:string}[]=[
 {id:'gallery',label:'Gallery',description:'A visual grid, lovely for covers and posters.'},
 {id:'shelf',label:'Shelf',description:'A row of favourites you can scroll along.'},
 {id:'spotlight',label:'Spotlight',description:'One star of the show, with the rest beside it.'},
 {id:'cards',label:'Collection cards',description:'Compact cards for milestones, rituals and mixed things.'},
 {id:'mixed',label:'Mixed',description:'Images and cards together, arranged for you.'},
];
export type ShowcaseVisibility='draft'|'private'|'friends';
export const visibilityLabels:Record<ShowcaseVisibility,{label:string;detail:string}>={
 draft:{label:'Draft',detail:'Still on your desk. Nobody else sees it.'},
 private:{label:'Just me',detail:'Finished, but kept to yourself.'},
 friends:{label:'Friends',detail:'Your friends can see it on your profile.'},
};

export type StarterIdea={id:string;title:string;line:string;icon:MuseIconName;gradient:string;layout:ShowcaseLayout;suggest:SourceKind[]};
export type SourceKind='book'|'media'|'curated'|'tarot-card'|'dream-symbol'|'ritual'|'side-quest'|'victory';
export const starterIdeas:StarterIdea[]=[
 {id:'favorites',title:'All-Time Favorites',line:'The ones you would save from a fire.',icon:'heart',gradient:'vampire-velvet',layout:'gallery',suggest:['book','media']},
 {id:'obsessions',title:'Current Obsessions',line:'Whatever has your whole heart this week.',icon:'flame',gradient:'solar-flare',layout:'shelf',suggest:['book','media','curated']},
 {id:'victories',title:'Little Victories',line:'Small wins worth a tiny parade.',icon:'sparkle',gradient:'golden-hour',layout:'cards',suggest:['victory','ritual','side-quest']},
 {id:'magical',title:'My Magical Side',line:'Cards, symbols and the moon’s opinions.',icon:'tarot',gradient:'nebula-kiss',layout:'mixed',suggest:['tarot-card','dream-symbol']},
 {id:'learning',title:'Things I’m Learning',line:'Skills, rituals and brave new habits.',icon:'graduation',gradient:'emerald-city',layout:'cards',suggest:['ritual','victory','book']},
 {id:'current',title:'Currently Reading & Watching',line:'What is on the nightstand and the screen.',icon:'bookshelf',gradient:'midnight-prism',layout:'shelf',suggest:['book','media']},
];

export const defaultProfile=(theme:string):ProfileDetails=>({tagline:'',bio:'',bannerGradient:'midnight-prism',theme:isThemeId(theme)?theme:'iridescent',sections:defaultSections,badges:[],visibility:'private'});
