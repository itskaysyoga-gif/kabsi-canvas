import { useState } from "react";
import { Check, Mail, MessageCircle, Share2, TriangleAlert } from "lucide-react";
import { Button, buttonClass } from "@/components/kabsi/ui";
import { copyText } from "@/lib/clipboard";
import { mailtoUrl, whatsappShareUrl } from "@/lib/manager-guide";

/**
 * A ready message the owner sends on to someone who can act (the owner of the profile, an agency, an IT administrator):
 * shown as text with Copy, Share, WhatsApp and Email. The WhatsApp link is a share link, so it needs no Kabsi number.
 * Plain text only: it never asks for a password or a code.
 */
export function ReadyMessage({ text, subject }: { text: string; subject: string }) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    const ok = await copyText(text);
    setCopied(ok ? "done" : "failed");
    window.setTimeout(() => setCopied("idle"), 2000);
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: subject, text });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    await copy();
  }

  return (
    <div className="rounded-card bg-surface-2 p-4">
      <p
        className="whitespace-pre-wrap rounded-card bg-surface-1 p-3 text-small leading-6"
        data-testid="ready-message"
      >
        {text}
      </p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          variant="secondary"
          size="md"
          onClick={copy}
          icon={
            copied === "done" ? (
              <Check className="size-5" />
            ) : copied === "failed" ? (
              <TriangleAlert className="size-5" />
            ) : null
          }
        >
          {copied === "done" ? "Copied" : copied === "failed" ? "Couldn't copy" : "Copy message"}
        </Button>
        <Button variant="secondary" size="md" onClick={share} icon={<Share2 className="size-5" />}>
          Share
        </Button>
        <a
          className={buttonClass("secondary", "md")}
          href={whatsappShareUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle className="size-5" /> WhatsApp
        </a>
        <a className={buttonClass("secondary", "md")} href={mailtoUrl(subject, text)}>
          <Mail className="size-5" /> Email
        </a>
      </div>
    </div>
  );
}
