import {MuseIconButton} from "./MuseIconButton";
import type { MovementType } from "@/lib/models";
import { MAX_QUICK_MOVEMENTS } from "@/lib/selections";
import { MuseIcon } from "./MuseIcon";
import { movementCategories, movementCategory, movementCategoryLabels, type MovementCategory } from "@/lib/progress/movement";

type Props = {
  types: MovementType[]; quickIds: string[];
  onToggleQuick: (id: string) => void; onRename: (id: string) => void; onDelete: (id: string) => void;
  /** Present when categories can be saved; classifies workouts for goals and connected Rituals. */
  onCategory?: (id: string, category: MovementCategory) => void;
};

export function MovementTypeManager({ types, quickIds, onToggleQuick, onRename, onDelete, onCategory }: Props) {
  return (
    <div className="movement-manager" role="group" aria-label="Manage saved movement types">
      <p className="editor-label">Daily Edit quick options <span className="selection-count">{quickIds.length}/{MAX_QUICK_MOVEMENTS}</span></p>
      <ul className="managed-type-list">
        {types.map((type) => (
          <li key={type.id}>
            <span className="managed-type-name">{type.name}</span>
            {onCategory && <select className="managed-type-category" aria-label={`Category for ${type.name}`} value={movementCategory(type)} onChange={(event) => onCategory(type.id, event.target.value as MovementCategory)}>{movementCategories.map((value) => <option key={value} value={value}>{movementCategoryLabels[value]}</option>)}</select>}
            <button type="button" className="choice-button quick-setting" aria-label={`Show ${type.name} in quick options`} aria-pressed={quickIds.includes(type.id)}
              disabled={!quickIds.includes(type.id) && quickIds.length >= MAX_QUICK_MOVEMENTS} onClick={() => onToggleQuick(type.id)}>
              Quick{quickIds.includes(type.id) && <MuseIcon name="check" size={12} />}
            </button>
            {type.source === "custom" && <span className="managed-type-actions">
              <button type="button" className="muse-button button-ghost" aria-label={`Rename ${type.name}`} onClick={() => onRename(type.id)}>Rename</button>
              <MuseIconButton icon="trash" label={`Delete ${type.name}`} onClick={() => onDelete(type.id)}/>
            </span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
