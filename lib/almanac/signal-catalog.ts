/**
 * The Almanac signal catalog (#53): every signal an entry may be written about, with its facts and the existing
 * function that computes it. Thresholds belong to those functions; this file only names what they already prove.
 * Examples are realistic sample values for the review sheet; they are not data.
 */
import type {SignalSpec} from './types';

export const signalCatalog:Record<string,SignalSpec>={
 // ---------- Reading (lib/whimsy/reading-dna.ts, reading-stats.ts, reading-challenge.ts, atlas-insights.ts) ----------
 'reading.trait.night-owl':{module:'reading',sensitivity:'ordinary',source:'readingTraits',means:'At least 10 timed sessions and 5 timed hours, with 40%+ of timed reading between 9 pm and 3 am.',
  facts:{share:{type:'ratio',example:.52},timedSessions:{type:'count',example:24}}},
 'reading.trait.early-bird':{module:'reading',sensitivity:'ordinary',source:'readingTraits',means:'At least 10 timed sessions and 5 timed hours, with 40%+ of timed reading between 5 and 9 am.',
  facts:{share:{type:'ratio',example:.46},timedSessions:{type:'count',example:18}}},
 'reading.trait.weekend':{module:'reading',sensitivity:'ordinary',source:'readingTraits',means:'At least 10 reading days, 60%+ of reading on Saturdays and Sundays.',
  facts:{share:{type:'ratio',example:.64},readingDays:{type:'count',example:22}}},
 'reading.trait.steady':{module:'reading',sensitivity:'ordinary',source:'readingTraits',means:'Reading on 60%+ of at least 30 eligible days.',
  facts:{readingDays:{type:'count',example:41},eligibleDays:{type:'count',example:58}}},
 'reading.trait.long-haul':{module:'reading',sensitivity:'ordinary',source:'readingTraits',means:'At least 10 timed sessions averaging an hour or more.',
  facts:{averageSeconds:{type:'seconds',example:4380},timedSessions:{type:'count',example:15}}},
 'reading.trait.little-often':{module:'reading',sensitivity:'ordinary',source:'readingTraits',means:'At least 10 timed sessions and 10 reading days, averaging 20 minutes or less.',
  facts:{averageSeconds:{type:'seconds',example:960},readingDays:{type:'count',example:27}}},
 'reading.trait.rereader':{module:'reading',sensitivity:'ordinary',source:'readingTraits',means:'Two or more rereads making up 20%+ of finished reads.',
  facts:{rereads:{type:'count',example:3},reads:{type:'count',example:11}}},
 'reading.persona':{module:'reading',sensitivity:'ordinary',source:'genrePersona',means:'At least five finished books with a genre in the period; the persona rule is fixed.',
  facts:{persona:{type:'label',example:'The Two-World Reader'},topGenre:{type:'label',example:'Fantasy'},books:{type:'count',example:9}}},
 'reading.milestone':{module:'reading',sensitivity:'ordinary',source:'readingMilestones + milestoneCelebration',means:'A milestone reached on the saved history and not shown before.',
  facts:{title:{type:'label',example:'1,000 pages'},metric:{type:'label',example:'pages',note:'books | pages | hours | days | sessions | streak'},threshold:{type:'count',example:1000},achievedOn:{type:'date',example:'2026-10-14'}}},
 'reading.streak':{module:'reading',sensitivity:'ordinary',source:'readingStreaks',means:'A current run of consecutive reading days (3 or more).',
  facts:{current:{type:'count',example:9},longest:{type:'count',example:14},readToday:{type:'boolean',example:true}}},
 'reading.challenge.progress':{module:'reading',sensitivity:'ordinary',source:'challengeProgress + challengeSignals',means:'A yearly challenge exists and a quarter threshold (25/50/75%) was just crossed.',
  facts:{done:{type:'count',example:12},target:{type:'count',example:24},threshold:{type:'count',example:50},year:{type:'label',example:'2026'},ahead:{type:'boolean',example:true}}},
 'reading.challenge.record':{module:'reading',sensitivity:'ordinary',source:'challengeSignals.personalRecord',means:'This year has more finished reads than any earlier year (and an earlier year had at least one).',
  facts:{done:{type:'count',example:27},previousBest:{type:'count',example:22},year:{type:'label',example:'2026'}}},
 'reading.authors.new':{module:'reading',sensitivity:'ordinary',source:'authorStats',means:'Three or more authors read for the first time in the period.',
  facts:{newAuthors:{type:'count',example:5},returningAuthors:{type:'count',example:2}}},
 'reading.author.returning':{module:'reading',sensitivity:'ordinary',source:'authorStats',means:'One author with three or more finished reads in the period.',
  facts:{author:{type:'label',example:'Ursula K. Le Guin'},reads:{type:'count',example:3},books:{type:'count',example:2}}},
 'reading.speed.swift':{module:'reading',sensitivity:'ordinary',source:'finishSpeed',means:'A read finished in three calendar days or fewer (start and finish recorded).',
  facts:{title:{type:'label',example:'Piranesi'},days:{type:'count',example:2}}},
 'reading.rhythm.hour':{module:'reading',sensitivity:'ordinary',source:'readingRhythm',means:'At least 3 timed sessions; the hour with the most active time.',
  facts:{hour:{type:'hour',example:21},weekday:{type:'label',example:'Sunday'},share:{type:'ratio',example:.31}}},

 // ---------- Rituals (lib/rituals.ts, lib/insights/revelations.ts) ----------
 'rituals.rhythm':{module:'rituals',sensitivity:'ordinary',source:'generateRevelations ritual-rhythm',means:'Among rituals with at least three logs and half their opportunities recorded, the highest full-goal share.',
  facts:{ritual:{type:'label',example:'Morning Pages'},complete:{type:'count',example:12},recorded:{type:'count',example:15},unknown:{type:'count',example:2}}},
 'rituals.streak':{module:'rituals',sensitivity:'ordinary',source:'ritualStreak',means:'A current run of consecutive scheduled opportunities met (never calendar days); 5 or more.',
  facts:{ritual:{type:'label',example:'Stretch'},count:{type:'count',example:11},unit:{type:'label',example:'scheduled days',note:'scheduled days | weeks'}}},
 'rituals.return':{module:'rituals',sensitivity:'ordinary',source:'ritualStreak + ritual records (P1 helper)',means:'A ritual met again today after at least 7 scheduled opportunities without a full goal. Never says it was missed.',
  facts:{ritual:{type:'label',example:'Evening walk'},gapOpportunities:{type:'count',example:9}}},

 // ---------- Planner, Wellness, Mood, Money, Nourish (lib/insights/revelations.ts — the current Little Revelations) ----------
 'planner.planned-completion':{module:'planner',sensitivity:'ordinary',source:'generateRevelations planned-completion',means:'Tasks planned in the range, with their current completion state (a snapshot, not history).',
  facts:{completed:{type:'count',example:14},planned:{type:'count',example:19}}},
 'planner.completion-comparison':{module:'planner',sensitivity:'ordinary',source:'generateRevelations completion-comparison',means:'Both equal-length periods have 3+ dated completions and no undated ones, and the counts differ.',
  facts:{difference:{type:'count',example:6,note:'absolute difference'},direction:{type:'label',example:'more',note:'more | fewer'},current:{type:'count',example:21},previous:{type:'count',example:15}}},
 'mood.often-felt':{module:'mood',sensitivity:'sensitive',source:'generateRevelations often-felt',means:'At least 3 check-ins; the feeling selected most often.',
  facts:{feeling:{type:'label',example:'Hopeful'},count:{type:'count',example:7},checkins:{type:'count',example:12}}},
 'wellness.water-goals':{module:'wellness',sensitivity:'personal',source:'generateRevelations water-goals',means:'At least 3 logged days with a known goal; days without logs are not misses.',
  facts:{met:{type:'count',example:9},knownGoals:{type:'count',example:13}}},
 'nourish.meal-rhythm':{module:'nourish',sensitivity:'ordinary',source:'generateRevelations meal-rhythm',means:'At least 3 days with a meal plan. Plans are not confirmed meals.',
  facts:{plannedDays:{type:'count',example:11},plans:{type:'count',example:17}}},
 'money.top-category':{module:'money',sensitivity:'sensitive',source:'generateRevelations spending-category',means:'At least 3 recorded transactions; the largest spending category.',
  facts:{category:{type:'label',example:'Groceries'},cents:{type:'cents',example:41280},transactions:{type:'count',example:23}}},

 // ---------- Dreams & Tarot ----------
 'dreams.recurring-symbol':{module:'dreams',sensitivity:'personal',source:'symbolDreamCounts',means:'A symbol tagged on 3+ dreams in the period.',
  facts:{symbol:{type:'label',example:'Water'},dreams:{type:'count',example:4}}},
 'dreams.symbol-pair':{module:'dreams',sensitivity:'personal',source:'symbolConstellation',means:'Two symbols tagged together on 2+ dreams.',
  facts:{first:{type:'label',example:'Doors'},second:{type:'label',example:'Stairs'},dreams:{type:'count',example:3}}},
 'tarot.recurring-card':{module:'tarot',sensitivity:'ordinary',source:'tarot draw history (P1 helper)',means:'A card drawn 3+ times in 30 days.',
  facts:{card:{type:'label',example:'The Star'},draws:{type:'count',example:3},days:{type:'count',example:30}}},

 // ---------- Cross-module (lib/insights/across.ts) — descriptive only, sample sizes always shown ----------
 'cross.reading-day':{module:'cross',sensitivity:'sensitive',crossModule:['reading','mood'],mustShow:['withN','withoutN'],source:'crossModuleConnections reading-day',means:'At least 5 rated days with reading and 5 without.',
  facts:{withN:{type:'count',example:14},withoutN:{type:'count',example:11},withMean:{type:'count',example:7.2},withoutMean:{type:'count',example:6.1}}},
 'cross.movement-energy':{module:'cross',sensitivity:'sensitive',crossModule:['wellness','mood'],mustShow:['withN','withoutN'],source:'crossModuleConnections movement-energy',means:'At least 5 rated days with recorded movement and 5 without.',
  facts:{withN:{type:'count',example:9},withoutN:{type:'count',example:12},withMean:{type:'count',example:6.8},withoutMean:{type:'count',example:5.9}}},

 // ---------- Recaps (recapFacts) — a source that did not load is null and its section is left out ----------
 'recap.week':{module:'recap',sensitivity:'personal',source:'recapFacts (7-day range)',means:'A completed local week with at least one recorded source.',
  facts:{tasks:{type:'count',example:17,nullable:true},ritualFullGoals:{type:'count',example:23,nullable:true},readingSeconds:{type:'seconds',example:18600,nullable:true},readingDays:{type:'count',example:5,nullable:true},booksFinished:{type:'count',example:1,nullable:true},workouts:{type:'count',example:4,nullable:true},moodCheckins:{type:'count',example:6,nullable:true}}},
 'recap.month':{module:'recap',sensitivity:'personal',source:'recapFacts (calendar month)',means:'A completed local month with at least one recorded source.',
  facts:{month:{type:'label',example:'October'},tasks:{type:'count',example:64,nullable:true},ritualFullGoals:{type:'count',example:88,nullable:true},readingSeconds:{type:'seconds',example:75600,nullable:true},readingDays:{type:'count',example:19,nullable:true},booksFinished:{type:'count',example:3,nullable:true},workouts:{type:'count',example:14,nullable:true},moodCheckins:{type:'count',example:21,nullable:true}}},
};
