// Shared by the ops scripts: SQL literals and a call to the Supabase Management API with SUPABASE_ACCESS_TOKEN (the token
// deploy.yml already uses). No service role key is needed and none leaves Supabase.

// A SQL string literal. standard_conforming_strings is on, so a backslash is literal; a NUL cannot be stored.
export const lit = (s) => `'${String(s).replace(/\0/g, "").replace(/'/g, "''")}'`;

export const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "ynjdqjlmdwjgbfezevxy";

export async function api(path, init = {}) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is not set");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok)
    throw new Error(
      `Supabase Management API answered ${res.status} for ${path}: ${(await res.text()).slice(0, 200)}`,
    );
  return res.json();
}

/** Runs SQL as the postgres role. Returns the rows of the last statement that returns any. */
export const runSql = (query) =>
  api("/database/query", { method: "POST", body: JSON.stringify({ query }) });
