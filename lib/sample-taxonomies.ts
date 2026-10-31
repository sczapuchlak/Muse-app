import type { ContextTag, MovementType } from "./models";

// Mock catalogs shared across daily records. These are not per-day labels.
export const sampleMovementTypes: MovementType[] = [
  { id: "movement-upper", name: "Upper", source: "starter", archived: false },
  { id: "movement-lower", name: "Lower", source: "starter", archived: false },
  { id: "movement-cardio", name: "Cardio", source: "starter", archived: false },
  { id: "movement-yoga", name: "Yoga", source: "starter", archived: false },
  { id: "movement-walk", name: "Walk", source: "starter", archived: false },
  { id: "movement-pilates", name: "Pilates", source: "custom", archived: false },
  { id: "movement-rowing", name: "Rowing", source: "custom", archived: false },
  { id: "movement-peloton", name: "Peloton", source: "custom", archived: false },
];

export const sampleContextTags: ContextTag[] = [
  { id: "context-work", name: "Work" },
  { id: "context-sleep", name: "Sleep" },
  { id: "context-social", name: "Social" },
  { id: "context-movement", name: "Movement" },
  { id: "context-health", name: "Health" },
  { id: "context-travel", name: "Travel" },
  { id: "context-money", name: "Money" },
  { id: "context-family", name: "Family" },
  ...["Relationships","Friends","Food","Weather","Creativity","Rest","Personal growth"].map((name)=>({id:`context-${name.toLowerCase().replaceAll(" ","-")}`,name})),
];
