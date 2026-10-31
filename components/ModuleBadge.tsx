export type SourceModule="planner"|"nourish"|"rituals";
const labels:Record<SourceModule,string>={planner:"Planner",nourish:"Wellness",rituals:"Rituals"};
/** Informational source identity. Manage is the separate, explicit navigation action. */
export function ModuleBadge({module}:{module:SourceModule}){return <span className="muse-module-badge" data-module={module} aria-label={`Source: ${labels[module]}`}>{labels[module]}</span>;}
