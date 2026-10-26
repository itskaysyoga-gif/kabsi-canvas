import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Kabsi's type scale (src/styles.css) uses names tailwind-merge cannot guess. Without this it reads
// "text-label" as a colour and drops it next to "text-kb-black".
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h2", "h3", "title", "lead", "body", "small", "label", "chat", "chat-meta"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
