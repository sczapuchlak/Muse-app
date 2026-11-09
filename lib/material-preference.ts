export const materials = ["crystal", "frosted"] as const;
export type Material = typeof materials[number];
export const MATERIAL_STORAGE_KEY = "muse.material";
const changeEvent = "muse-material-change";
let sessionMaterial: Material | null = null;
/**
 * #12: Crystal is temporarily hidden while its button and surface states are refined; Frosted is the only material
 * offered. A saved "crystal" choice is kept as saved but shows as Frosted. Add "crystal" back here to offer it again.
 */
export const offeredMaterials: readonly Material[] = ["frosted"];
export const effectiveMaterial = (value: string | null | undefined): Material => (offeredMaterials as readonly string[]).includes(value ?? "") ? value as Material : "frosted";
export const serverMaterial = (): Material => "frosted";
export function readMaterial(): Material {
  if (sessionMaterial) return effectiveMaterial(sessionMaterial);
  try { return effectiveMaterial(window.localStorage.getItem(MATERIAL_STORAGE_KEY) ?? "frosted"); } catch { return "frosted"; }
}
export function selectMaterial(material: Material) {
  sessionMaterial = material;
  try { window.localStorage.setItem(MATERIAL_STORAGE_KEY, material); } catch { /* Preference remains usable in memory. */ }
  window.dispatchEvent(new Event(changeEvent));
}
export function subscribeMaterial(update: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === MATERIAL_STORAGE_KEY || event.key === null) { sessionMaterial = null; update(); } };
  window.addEventListener("storage", storage); window.addEventListener(changeEvent, update);
  return () => { window.removeEventListener("storage", storage); window.removeEventListener(changeEvent, update); };
}
