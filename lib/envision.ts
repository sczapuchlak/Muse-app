/** Envision (#117): Aspirations | Vision Boards | Bucket List. Aspirations is the default tab. */
export const envisionTabs = [
  { id: "aspirations", label: "Aspirations" },
  { id: "vision-boards", label: "Vision Boards" },
  { id: "bucket", label: "Bucket List" },
] as const;
export type EnvisionTab = typeof envisionTabs[number]["id"];
export const parseEnvisionTab = (value: string | null | undefined): EnvisionTab => envisionTabs.find((t) => t.id === value)?.id ?? "aspirations";
