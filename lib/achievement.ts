/** Pure transition policy shared by mounted goal indicators. Loading history never celebrates. */
export type AchievementObservation = { observed:boolean; awarded:boolean };
export function observeAchievement(previous:AchievementObservation,achieved:boolean,ready=true,replayOnReentry=false):AchievementObservation & {celebrate:boolean} {
  if (!ready) return {observed:false,awarded:previous.awarded,celebrate:false};
  if (!previous.observed) return {observed:true,awarded:previous.awarded||achieved,celebrate:false};
  if (!achieved) return {observed:true,awarded:replayOnReentry?false:previous.awarded,celebrate:false};
  if (previous.awarded) return {...previous,celebrate:false};
  return {observed:true,awarded:true,celebrate:true};
}
