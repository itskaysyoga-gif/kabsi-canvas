// The Nora chat widget (assistant-widget.tsx) keeps its own visitor and conversation ids in
// localStorage, separate from the Supabase auth session. If a second person signs in on the same
// device without clearing these, the widget resumes the FIRST person's conversation for them
// (confirmed live: signing in as a different owner opened yesterday's chat, D265). auth-provider.tsx
// calls clearAssistantChat() whenever the signed-in user changes, same as it clears the query cache.
// The assistant Edge Function also refuses to hand back a conversation to anyone but the user it's
// linked to, so this is defense in depth rather than the only guard.
export const ASSISTANT_VISITOR_KEY = "kabsi.assistant.visitor";
export const ASSISTANT_CONVERSATION_KEY = "kabsi.assistant.conversation";

export function clearAssistantChat() {
  try {
    window.localStorage.removeItem(ASSISTANT_VISITOR_KEY);
    window.localStorage.removeItem(ASSISTANT_CONVERSATION_KEY);
  } catch {
    /* private mode: nothing was persisted anyway */
  }
}
