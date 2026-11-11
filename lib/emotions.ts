import type { Emotion, EmotionQuadrant } from "./models";

// Muse's shared vocabulary, aligned to the Yale/RULER energy × pleasantness model:
// https://rulerapproach.org/wp-content/uploads/2020/07/MoodMeter_FC.pdf
// This is a curated vocabulary, not a reproduction of the official chart.
// IDs are explicit and stay fixed when labels, emoji, or definitions change.
type EmotionEntry = readonly [id: string, name: string, emoji: string, definition?: string];
/** Words people feel differently. Selecting one offers a quick choice of how it feels to them; the default below is only a starting point. */
const ambiguousIds = new Set(["emotion-lazy", "emotion-numb", "emotion-nostalgic", "emotion-bittersweet", "emotion-competitive", "emotion-intense", "emotion-restless", "emotion-jittery", "emotion-spent"]);
function inQuadrant(quadrant: EmotionQuadrant, entries: EmotionEntry[]): Emotion[] {
  return entries.map(([id, name, emoji, definition]) => ({ id, name, emoji, quadrant, definition, ...(ambiguousIds.has(id) ? { ambiguous: true } : {}) }));
}

export const emotionCatalog: Emotion[] = [
  ...inQuadrant("red", [
    ["emotion-afraid", "Afraid", "😨"],
    ["emotion-alarmed", "Alarmed", "😳"],
    ["emotion-angry", "Angry", "😠"],
    ["emotion-annoyed", "Annoyed", "😒"],
    ["emotion-anxious", "Anxious", "😟", "Feeling worried or on edge."],
    ["emotion-apprehensive", "Apprehensive", "😬"],
    ["emotion-frustrated", "Frustrated", "😤", "Feeling blocked or irritated."],
    ["emotion-furious", "Furious", "😡"],
    ["emotion-irritated", "Irritated", "😣"],
    ["emotion-jittery", "Jittery", "😵‍💫"],
    ["emotion-nervous", "Nervous", "😬"],
    ["emotion-overwhelmed", "Overwhelmed", "😵", "Feeling that there is more to handle than you have room for."],
    ["emotion-panicked", "Panicked", "😰"],
    ["emotion-restless", "Restless", "😖", "Feeling unsettled and unable to comfortably stay still."],
    ["emotion-stressed", "Stressed", "😓"],
    ["emotion-tense", "Tense", "😬"],
    ["emotion-troubled", "Troubled", "😟"],
    ["emotion-uneasy", "Uneasy", "😕"],
    ["emotion-worried", "Worried", "😟"],
    ["emotion-repulsed", "Repulsed", "😖"],
    ["emotion-intense", "Intense", "🔥", "Feeling everything at full strength."],
  ]),
  ...inQuadrant("blue", [
    ["emotion-alienated", "Alienated", "🫥"],
    ["emotion-apathetic", "Apathetic", "😐"],
    ["emotion-bored", "Bored", "🥱"],
    ["emotion-defeated", "Defeated", "😞"],
    ["emotion-dejected", "Dejected", "😞"],
    ["emotion-disappointed", "Disappointed", "😞"],
    ["emotion-discouraged", "Discouraged", "😔"],
    ["emotion-disheartened", "Disheartened", "😔"],
    ["emotion-down", "Down", "😔"],
    ["emotion-drained", "Drained", "😮‍💨", "Feeling depleted and in need of rest."],
    ["emotion-exhausted", "Exhausted", "😩"],
    ["emotion-fatigued", "Fatigued", "😴"],
    ["emotion-gloomy", "Gloomy", "😞"],
    ["emotion-grieving", "Grieving", "😢"],
    ["emotion-hopeless", "Hopeless", "😞"],
    ["emotion-lonely", "Lonely", "😔", "Feeling a lack of the connection or company you want."],
    ["emotion-miserable", "Miserable", "😣"],
    ["emotion-sad", "Sad", "😔", "Feeling down or sorrowful."],
    ["emotion-spent", "Spent", "😮‍💨"],
    ["emotion-tired", "Tired", "🥱"],
    ["emotion-lazy", "Lazy", "🛋️", "Feeling unmotivated or slow. For some people this is restful, for others it is heavy."],
    ["emotion-numb", "Numb", "😶", "Feeling little, or cut off from feeling."],
    ["emotion-bittersweet", "Bittersweet", "🥲", "Happy and sad together."],
  ]),
  ...inQuadrant("green", [
    ["emotion-at-ease", "At ease", "😌"],
    ["emotion-balanced", "Balanced", "⚖️"],
    ["emotion-calm", "Calm", "😌", "Feeling settled and at ease."],
    ["emotion-carefree", "Carefree", "🍃"],
    ["emotion-comfortable", "Comfortable", "😌"],
    ["emotion-content", "Content", "🙂", "Feeling quietly satisfied with the present."],
    ["emotion-cozy", "Cozy", "🫖"],
    ["emotion-easygoing", "Easygoing", "🙂"],
    ["emotion-fulfilled", "Fulfilled", "😌"],
    ["emotion-grateful", "Grateful", "🙏"],
    ["emotion-included", "Included", "🤝"],
    ["emotion-loving", "Loving", "💗"],
    ["emotion-mellow", "Mellow", "😌"],
    ["emotion-peaceful", "Peaceful", "🕊️", "Feeling quiet and free from inner conflict."],
    ["emotion-relaxed", "Relaxed", "😌"],
    ["emotion-rested", "Rested", "🙂"],
    ["emotion-satisfied", "Satisfied", "🙂"],
    ["emotion-secure", "Secure", "🫶"],
    ["emotion-serene", "Serene", "🌿"],
    ["emotion-tranquil", "Tranquil", "🕊️"],
    ["emotion-nostalgic", "Nostalgic", "🕰️", "A soft longing for the way things were."],
  ]),
  ...inQuadrant("yellow", [
    ["emotion-cheerful", "Cheerful", "😄"],
    ["emotion-confident", "Confident", "😎"],
    ["emotion-delighted", "Delighted", "😊"],
    ["emotion-eager", "Eager", "😃"],
    ["emotion-elated", "Elated", "😁"],
    ["emotion-energized", "Energized", "⚡"],
    ["emotion-enthusiastic", "Enthusiastic", "😃"],
    ["emotion-excited", "Excited", "😃", "Feeling eager and energized about something."],
    ["emotion-exhilarated", "Exhilarated", "😁"],
    ["emotion-happy", "Happy", "😊"],
    ["emotion-hopeful", "Hopeful", "🌱", "Looking ahead with a sense of possibility."],
    ["emotion-inspired", "Inspired", "💡"],
    ["emotion-joyful", "Joyful", "😊", "Feeling bright, happy, and full of life."],
    ["emotion-lively", "Lively", "😄"],
    ["emotion-motivated", "Motivated", "💪"],
    ["emotion-optimistic", "Optimistic", "🙂"],
    ["emotion-playful", "Playful", "😋"],
    ["emotion-proud", "Proud", "😊"],
    ["emotion-thrilled", "Thrilled", "😁"],
    ["emotion-upbeat", "Upbeat", "😄"],
    ["emotion-competitive", "Competitive", "😤", "Fired up to win or to measure yourself."],
  ]),
].sort((a, b) => a.name.localeCompare(b.name, "en"));

const suggestedIds = new Set([
  "emotion-anxious", "emotion-overwhelmed", "emotion-restless",
  "emotion-lonely", "emotion-drained", "emotion-sad",
  "emotion-calm", "emotion-content", "emotion-peaceful",
  "emotion-excited", "emotion-hopeful", "emotion-joyful",
]);

export function findEmotions(emotions: Emotion[], query: string): Emotion[] {
  const search = query.trim().toLocaleLowerCase("en-US");
  return emotions.filter((emotion) => search
    ? emotion.name.toLocaleLowerCase("en-US").includes(search)
    : suggestedIds.has(emotion.id));
}
