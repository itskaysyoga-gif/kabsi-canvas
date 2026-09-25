import { supabase } from "@/lib/supabase";

export async function callFunction<TResponse, TBody = Record<string, unknown>>(
  name: string,
  body: TBody,
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke<TResponse>(name, { body });
  if (error) throw new Error(error.message || `Unable to call ${name}.`);
  return data;
}
