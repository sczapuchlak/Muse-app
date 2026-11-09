/** Vision Boards persistence (#118): owner-only rows, revision-checked so two devices never overwrite each other. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { blankBoard, isBoardPeriod, isBoardSize, parseBackground, parseElements, type VisionBoard } from "./model";

type Client = SupabaseClient<Database>;
type Row = Database["public"]["Tables"]["vision_boards"]["Row"];
const columns = "id,title,description,theme,period,period_start,size,background,elements,revision,created_at,updated_at";
const stale = "This board changed on another device. Reload to see the latest before saving again.";

export function boardFromRow(r: Omit<Row, "user_id" | "asset_paths">): VisionBoard {
  return {
    ...blankBoard(r.id, r.created_at),
    title: r.title, description: r.description ?? "", theme: r.theme ?? "",
    period: isBoardPeriod(r.period) ? r.period : null, periodStart: isBoardPeriod(r.period) ? r.period_start : null,
    size: isBoardSize(r.size) ? r.size : "landscape", background: parseBackground(r.background), elements: parseElements(r.elements),
    revision: r.revision, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
function toRow(b: VisionBoard) {
  return {
    title: b.title.trim().slice(0, 120), description: b.description.trim().slice(0, 2000) || null, theme: b.theme.trim().slice(0, 60) || null,
    period: b.period, period_start: b.period ? b.periodStart : null, size: b.size,
    background: b.background as unknown as NonNullable<Json>, elements: parseElements(b.elements) as unknown as NonNullable<Json>,
  };
}
/** Postgres "table missing" codes: this server hasn't had the Vision Boards migration yet. */
export const missingTable = (e: unknown) => ["PGRST205", "42P01"].includes((e as { code?: string })?.code ?? "");

export async function loadBoards(client: Client): Promise<VisionBoard[]> {
  const { data, error } = await client.from("vision_boards").select(columns).order("updated_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map((r) => boardFromRow(r as Row));
}
export async function loadBoard(client: Client, id: string): Promise<VisionBoard | null> {
  const { data, error } = await client.from("vision_boards").select(columns).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? boardFromRow(data as Row) : null;
}
/** Inserts the first save (revision 0); later saves update only if nobody else saved in between. */
export async function saveBoard(client: Client, b: VisionBoard): Promise<VisionBoard> {
  const row = toRow(b);
  const res = b.revision === 0
    ? await client.from("vision_boards").insert({ id: b.id, ...row }).select(columns).single()
    : await client.from("vision_boards").update(row).eq("id", b.id).eq("revision", b.revision).select(columns).maybeSingle();
  if (res.error) throw res.error;
  if (!res.data) throw Error(stale);
  return boardFromRow(res.data as Row);
}
/** Deletes only the board. Linked Aspirations and dreams are untouched; image files are cleaned up separately. */
export async function deleteBoard(client: Client, b: Pick<VisionBoard, "id" | "revision">) {
  const res = await client.from("vision_boards").delete().eq("id", b.id).eq("revision", b.revision).select("id").maybeSingle();
  if (res.error) throw res.error;
  if (!res.data) throw Error(stale);
}
