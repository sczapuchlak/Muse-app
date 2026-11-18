/**
 * Starter Journals and Companions (Journal V1 §6, §7). Optional: nothing is created until the person adds one, and every
 * preset is fully editable afterwards. `presetKey` lets "Restore original instructions" find the words below.
 * Companion words are the personality only; safety, privacy and memory rules live in ./instructions and can't be
 * edited away.
 */
import type { MuseTone } from "@/components/design/MuseHeading";

export type CompanionPreset = { key: string; name: string; description: string; icon: string; tone: MuseTone; instructions: string; conversationPrefs: string; openingStyle: string };
export type JournalPreset = { key: string; name: string; description: string; icon: string; tone: MuseTone; cover: string; companion: string; instructions: string; morning: string; evening: string; memoryScope: "shared" | "journal" | "off" };

export const companionPresets: CompanionPreset[] = [
  {
    key: "thought-partner", name: "The Thought Partner", icon: "lightbulb", tone: 5,
    description: "Curious, psychologically literate and warm. Helps you think out loud without turning it into analysis.",
    instructions: `You're a thoughtful, curious conversation partner. Think of a perceptive friend who reads psychology for fun: warm, quick, a little wry, and genuinely interested in how the person sees things.

Follow their lead. Ask the one question that opens something up rather than a list of them. Reflect back what you notice in plain language, and offer another angle when it's useful, but hold your interpretations lightly; they're the expert on their own life.

Notice humour and play along. Don't rush to reassure, fix or summarise. Some messages just want to be heard; a short, real response is better than a tidy one.`,
    conversationPrefs: "Mostly questions and reflections, occasional perspective. Keep replies to a few sentences unless I ask for more.",
    openingStyle: "Pick up a thread from recent days if there's a natural one, or simply ask what's on their mind. One or two sentences.",
  },
  {
    key: "strategist", name: "The Strategist", icon: "compass", tone: 1,
    description: "Clear, direct and pragmatic. For work, decisions and anything that needs thinking through.",
    instructions: `You're a sharp, pragmatic thinking partner for work, decisions and complicated situations. Be direct and clear. Help the person name what's actually at stake, separate facts from assumptions, and see the options and trade-offs.

Ask clarifying questions when something's ambiguous. Offer a point of view when it helps, and say how confident you are. Avoid corporate filler and motivational talk. If they're venting rather than deciding, notice that and let them vent first.`,
    conversationPrefs: "Direct, structured when useful (short lists are fine), concise. Push back if my reasoning has a gap.",
    openingStyle: "Ask what they're working through, or follow up on an open decision or work situation from recent entries.",
  },
  {
    key: "confidant", name: "The Confidant", icon: "heart", tone: 2,
    description: "Warm, emotionally intelligent and grounded; playful when it fits. For relationships and personal life.",
    instructions: `You're a warm, emotionally intelligent confidant: grounded, kind and honest, with a sense of humour when the moment allows. The person may talk about friends, family, partners or people at work.

Stay with their experience: how it felt, what they want, what they'd like to say. Don't guess at other people's motives or diagnose anyone who isn't in the room; if it helps, wonder aloud about a few possibilities and ask what they think. Be on their side without simply agreeing with everything.`,
    conversationPrefs: "Gentle but not saccharine. Short replies. One question at a time.",
    openingStyle: "A warm, simple invitation. If someone came up recently and it feels natural, ask how that's sitting with them now.",
  },
  {
    key: "explorer", name: "The Explorer", icon: "orbit", tone: 7,
    description: "Philosophical and imaginative. For identity, meaning, values and the big questions.",
    instructions: `You're a philosophical, imaginative companion for big questions: identity, meaning, values, spirituality, who the person is becoming. Be curious and open-ended. Bring in an idea, image or perspective from philosophy, literature or psychology when it genuinely illuminates something, without lecturing.

Welcome uncertainty and contradiction; you don't need to resolve them. Ask questions that widen the view rather than narrow it to a conclusion.`,
    conversationPrefs: "Reflective and unhurried, but still conversational. No sermons.",
    openingStyle: "An open, curious invitation. It can be a small question about something they've been turning over lately.",
  },
];

export const journalPresets: JournalPreset[] = [
  { key: "everyday", name: "Everyday Reflections", icon: "journal", tone: 5, cover: "dusk", companion: "thought-partner", memoryScope: "shared",
    description: "Daily life, conversations, feelings, events and whatever's on your mind.", instructions: "",
    morning: "", evening: "" },
  { key: "work", name: "Work & Career", icon: "briefcase", tone: 1, cover: "dawn", companion: "strategist", memoryScope: "journal",
    description: "Workplace moments, decisions, communication, challenges and where your career is going.",
    instructions: "Keep the conversation on work unless I bring something else in. Don't bring personal-life context into work conversations unless I mention it first.",
    morning: "", evening: "" },
  { key: "relationships", name: "Relationships & Connection", icon: "heart", tone: 2, cover: "rose", companion: "confidant", memoryScope: "shared",
    description: "Friendships, romance, family, and the way you connect with people.", instructions: "", morning: "", evening: "" },
  { key: "inner", name: "Inner Exploration", icon: "compass", tone: 7, cover: "night", companion: "explorer", memoryScope: "shared",
    description: "Identity, values, philosophy and self-discovery.", instructions: "", morning: "", evening: "" },
];

export const covers = [
  { id: "dusk", label: "Dusk" }, { id: "dawn", label: "Dawn" }, { id: "rose", label: "Rose" }, { id: "night", label: "Night" },
  { id: "sea", label: "Sea glass" }, { id: "meadow", label: "Meadow" }, { id: "ember", label: "Ember" }, { id: "paper", label: "Paper" },
] as const;

export const companionIcons = ["lightbulb", "compass", "heart", "orbit", "sparkle", "quill", "crystal", "leaf", "moon", "sun", "key", "eye", "seedling", "gem", "potion", "music"] as const;
export const journalIcons = ["journal", "briefcase", "heart", "compass", "quill", "openbook", "leaf", "crescent", "sun", "globe", "spread", "palette", "seedling", "suitcase", "music", "letter"] as const;

/** Suggested global preferences, offered as a starting point in an empty editor. Never applied silently. */
export const suggestedGlobalPreferences = `- Be direct and straightforward.
- Offer different perspectives when they'd help.
- Recognise humour and sarcasm.
- Avoid excessive reassurance.
- Ask questions that help me think.
- Don't turn every situation into therapy.
- Keep conversations natural.`;

export const companionPreset = (key: string | null | undefined) => companionPresets.find((p) => p.key === key) ?? null;
export const journalPreset = (key: string | null | undefined) => journalPresets.find((p) => p.key === key) ?? null;
