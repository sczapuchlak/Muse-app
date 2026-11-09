/** Fixed module identity. Daily Edit and Insights keep their separate editorial rotation. */
export const pageMantras = {
  Planner: 'THE ART OF GETTING SH!T DONE',
  Rituals: 'ON REPEAT, BY DESIGN',
  Envision: 'MANIFESTING, BUT MAKE IT ORGANIZED',
  Wellness: "Take care of yourself. You've got places to be.",
  Mood: 'FEEL IT. NAME IT. TRACK IT.',
  Money: "REASONS WHY I'M NOT A MILLIONAIRE",
  Notes: 'GET IT OUT OF YOUR HEAD',
  Mindspace: 'GET IT OUT OF YOUR HEAD',
  Whimsy: 'A LITTLE MAGIC NEVER HURT',
} as const;

export function pageMantra(title: string): string | undefined {
  return Object.hasOwn(pageMantras, title) ? pageMantras[title as keyof typeof pageMantras] : undefined;
}
