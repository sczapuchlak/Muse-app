/** Date-level expression is independent of emotional sessions and Yale vocabulary. */
export type DailyExpression={intention:string;intentionEmoji:string|null;dayInThree:string[]};
export function dailyExpression(records:Record<string,unknown>,date:string):DailyExpression {
 const intention=records[`${date}/intention`],emoji=records[`${date}/intention-emoji`],three=records[`${date}/day-in-three`];
 return {intention:typeof intention==='string'?intention:'',intentionEmoji:typeof emoji==='string'?emoji:null,dayInThree:Array.isArray(three)?three.filter((item):item is string=>typeof item==='string').slice(0,3):[]};
}
export function reorderDayInThree(values:string[],from:number,to:number):string[]{if(from<0||to<0||from>=values.length||to>=values.length)return values;const next=[...values],value=next.splice(from,1)[0];next.splice(to,0,value);return next;}
/** Draft-only picker policy. Confirmation belongs to the caller, never mutates saved values. */
export function changeEmojiDraft(values:string[],emoji:string,replaceIndex:number|null=null):string[]{
 if(replaceIndex!==null){if(replaceIndex<0||replaceIndex>=values.length)return values;return values.map((value,index)=>index===replaceIndex?emoji:value);}
 const existing=values.indexOf(emoji);if(existing>=0)return values.filter((_,index)=>index!==existing);
 return values.length<3?[...values,emoji]:values;
}
