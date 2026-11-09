import { allThemes } from "./themes";
import { THEME_STORAGE_KEY } from "./theme-preference";
import { MATERIAL_STORAGE_KEY, offeredMaterials } from "./material-preference";

/**
 * Runs synchronously in <head> before the first paint (see the Next.js "Preventing flash before hydration" guide).
 * Only known theme ids and materials are ever written to <html>; anything else keeps the server default.
 * The theme and material stores take over after hydration with the same values.
 */
const ids = JSON.stringify(allThemes.map((theme) => theme.id));
export const appearancePrePaintScript = `(function(){try{var d=document.documentElement,t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}),m=localStorage.getItem(${JSON.stringify(MATERIAL_STORAGE_KEY)});if(${ids}.indexOf(t)>-1)d.setAttribute("data-theme",t);d.setAttribute("data-material",${JSON.stringify(offeredMaterials)}.indexOf(m)>-1?m:"frosted")}catch(e){}})()`;
