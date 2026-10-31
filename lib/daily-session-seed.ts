import {dailyEditSample} from './daily-edit-data';
/** The existing single fictional Daily Edit day, registered once in the canonical session. */
export const dailySessionSeed={
 [`${dailyEditSample.date.iso}/intention`]:dailyEditSample.intention,
 [`${dailyEditSample.date.iso}/movement`]:dailyEditSample.movement,
 [`${dailyEditSample.date.iso}/water`]:{date:dailyEditSample.water.date,total:dailyEditSample.water.total,goal:dailyEditSample.water.settings.goal,unit:dailyEditSample.water.settings.unit},
};
