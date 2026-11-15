/** Envision (#117): Life Atlas (aspirations, #190) | Visions | Bucket List | Inner Compass (#210). The Life Atlas is the default tab; its id stays "aspirations" so links keep working. */
export const envisionTabs = [
  { id: "aspirations", label: "Life Atlas" },
  { id: "vision-boards", label: "Visions" },
  { id: "bucket", label: "Bucket List" },
  { id: "inner-compass", label: "Inner Compass" },
] as const;
export type EnvisionTab = typeof envisionTabs[number]["id"];
export const parseEnvisionTab = (value: string | null | undefined): EnvisionTab => envisionTabs.find((t) => t.id === value)?.id ?? "aspirations";
