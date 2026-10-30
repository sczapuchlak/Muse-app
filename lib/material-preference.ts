export const materials = ["crystal", "frosted"] as const;
export type Material = typeof materials[number];
export const MATERIAL_STORAGE_KEY = "muse.material";
const changeEvent = "muse-material-change";
let sessionMaterial: Material | null = null;
export const serverMaterial = (): Material => "crystal";
export function readMaterial(): Material {
  if (sessionMaterial) return sessionMaterial;
  try { return window.localStorage.getItem(MATERIAL_STORAGE_KEY) === "frosted" ? "frosted" : "crystal"; } catch { return "crystal"; }
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
