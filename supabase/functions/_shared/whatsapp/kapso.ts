// The live sender for the WhatsApp owner channel (P0.8-03): Kapso's whatsapp-cloud-api-js client through the Kapso
// proxy. Used only when the live switch is on (WHATSAPP_LIVE=true), the number setting is filled in, and both
// KAPSO_API_KEY and KAPSO_PHONE_NUMBER_ID are set in Supabase secrets; otherwise the mock sender is used and nothing
// leaves Kabsi (K-146). The key is read from the environment only and never logged.
import type { Button } from "./channel.ts";
import { mockSender, type Sender } from "./deliver.ts";

const KAPSO_PROXY = "https://api.kapso.ai/meta/whatsapp";

export type SenderEnv = { live: string | undefined; apiKey: string | undefined; phoneNumberId: string | undefined; numberOn: boolean };

export function senderMode(e: SenderEnv): "live" | "mock" {
  return e.live === "true" && e.numberOn && !!e.apiKey && !!e.phoneNumberId ? "live" : "mock";
}

export async function pickSender(e: SenderEnv): Promise<Sender> {
  if (senderMode(e) !== "live") return mockSender();
  const { WhatsAppClient } = await import("npm:@kapso/whatsapp-cloud-api@0.4.0");
  const client = new WhatsAppClient({ baseUrl: KAPSO_PROXY, kapsoApiKey: e.apiKey! });
  const phoneNumberId = e.phoneNumberId!;
  const idOf = (r: { messages?: { id?: string }[] }) => r.messages?.[0]?.id ?? "";
  return {
    live: true,
    text: async (to, body) => ({ id: idOf(await client.messages.sendText({ phoneNumberId, to, body })) }),
    buttons: async (to, body, buttons: Button[]) => ({
      id: idOf(await client.messages.sendInteractiveButtons({ phoneNumberId, to, bodyText: body, buttons })),
    }),
    // Only Meta-approved templates, by name; the parameters are plain text (K-129 point 4).
    template: async (to, name, params) => ({
      id: idOf(await client.messages.sendRaw({
        phoneNumberId,
        payload: {
          messaging_product: "whatsapp", recipient_type: "individual", to, type: "template",
          template: { name, language: { code: "en" }, components: [{ type: "body", parameters: Array.isArray(params)
            ? params.map((text) => ({ type: "text", text }))
            // Named parameters (templates.ts): each carries its name.
            : Object.entries(params).map(([parameter_name, text]) => ({ type: "text", parameter_name, text })) }] },
        },
      })),
    }),
    media: async (mediaId) => new Uint8Array(await client.media.download({ mediaId, phoneNumberId }) as ArrayBuffer),
  };
}
