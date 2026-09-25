import { supabase } from "@/lib/supabase";

export async function callFunction<TResponse, TBody extends Record<string, unknown> = Record<string, unknown>>(
  name: string,
  body: TBody,
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke<TResponse>(name, { body });
  if (error) throw new Error(error.message || `Unable to call ${name}.`);
  if (data === null) throw new Error(`${name} returned no data.`);
  return data;
}
