import { validDate } from './dates';
export const zodiacSigns=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'] as const;
export type ZodiacSign=typeof zodiacSigns[number];
export const zodiacLabel=(sign:ZodiacSign)=>sign[0].toUpperCase()+sign.slice(1);
export type CosmicPreferences={enabled:boolean;sign:ZodiacSign|null};
export const defaultCosmicPreferences:CosmicPreferences={enabled:true,sign:null};
export function parseCosmicPreferences(raw:string|null):CosmicPreferences {try{if(!raw)return defaultCosmicPreferences;const value=JSON.parse(raw);return {enabled:value?.enabled===true,sign:zodiacSigns.includes(value?.sign)?value.sign:null};}catch{return defaultCosmicPreferences;}}
export type Forecast={sign:ZodiacSign;date:string;text:string;attribution:string;retrievedAt:string};
export type ForecastResult={status:'ready';forecast:Forecast;cached:boolean}|{status:'unavailable';message:string}|{status:'error';message:string};
export interface ForecastProvider {getForecast(sign:ZodiacSign,date:string):Promise<ForecastResult>}
/** No API or prediction is represented as connected. The UI remains useful and truthful. */
export const unavailableForecastProvider:ForecastProvider={async getForecast(){return {status:'unavailable',message:'A live horoscope provider is not connected yet.'};}};
export function cachedForecastProvider(provider:ForecastProvider):ForecastProvider {
 const cache=new Map<string,Forecast>();
 return {async getForecast(sign,date){if(!validDate(date))return {status:'error',message:'Choose a valid forecast date.'};const key=`${date}/${sign}`,existing=cache.get(key);if(existing)return {status:'ready',forecast:existing,cached:true};try{const result=await provider.getForecast(sign,date);if(result.status==='ready'){if(result.forecast.date!==date||result.forecast.sign!==sign||!result.forecast.text.trim()||!result.forecast.attribution.trim())return {status:'error',message:'The forecast source returned an invalid response.'};cache.set(key,result.forecast);if(cache.size>24)cache.delete(cache.keys().next().value!);}return result;}catch{return {status:'error',message:'The forecast could not be retrieved. Please try again later.'};}}};
}
