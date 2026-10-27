import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

// Green and a tick when on (DESIGN.md: kb-green for switch on), the same look as the Switch in src/components/kabsi/ui.tsx.
// 44 px tall touch area around a 32 px track.
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "press peer relative inline-flex h-8 w-13 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors duration-200 ease-kb before:absolute before:-inset-1.5 before:content-[''] disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-kb-green data-[state=checked]:bg-kb-green data-[state=unchecked]:border-stroke data-[state=unchecked]:bg-surface-2",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb className="group pointer-events-none grid size-6 place-items-center rounded-full bg-kb-white shadow-rest transition-transform duration-200 ease-kb data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0">
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="size-3.5 fill-none stroke-kb-green stroke-[3] opacity-0 group-data-[state=checked]:opacity-100"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
