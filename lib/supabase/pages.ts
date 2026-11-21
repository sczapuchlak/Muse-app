/**
 * Every row of a list read. Hosted Supabase answers at most 1000 rows per request (the API's max_rows), whatever
 * `.limit()` asks for, so any list that can grow past that is read in pages. The caller orders by a unique key so
 * pages never skip or repeat a row.
 */
export async function allPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, tooMany = "This list is too large to read at once. Contact support."): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < 1000000; from += 1000) {
    const result = await read(from, from + 999);
    if (result.error) throw result.error;
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 1000) return rows;
  }
  throw Error(tooMany);
}
