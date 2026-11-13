/** Envision (#117): Life Atlas (aspirations, #190) | Vision Boards | Bucket List. The Life Atlas is the default tab; its id stays "aspirations" so links keep working. */
export const envisionTabs = [
  { id: "aspirations", label: "Life Atlas" },
  { id: "vision-boards", label: "Vision Boards" },
  { id: "bucket", label: "Bucket List" },
] as const;
export type EnvisionTab = typeof envisionTabs[number]["id"];
export const parseEnvisionTab = (value: string | null | undefined): EnvisionTab => envisionTabs.find((t) => t.id === value)?.id ?? "aspirations";
