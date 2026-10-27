import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-[52px] cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-pill px-6 text-body font-bold transition-[background-color,color,transform] focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // K-108: three kinds. primary is yellow (one per screen), secondary is a black outline, tertiary is a text link.
        primary:
          "bg-kb-yellow text-kb-black hover:bg-kb-yellow-pressed active:translate-y-px active:bg-kb-yellow-pressed",
        secondary:
          "border-2 border-text-1 bg-transparent text-text-1 hover:bg-surface-2 active:translate-y-px",
        tertiary:
          "h-auto rounded-none bg-transparent p-0 text-text-1 underline underline-offset-4 hover:no-underline",
        default:
          "bg-kb-yellow text-kb-black hover:bg-kb-yellow-pressed active:translate-y-px active:bg-kb-yellow-pressed",
        outline:
          "border-2 border-text-1 bg-transparent text-text-1 hover:bg-surface-2 active:translate-y-px",
        ghost: "bg-transparent text-text-1 hover:bg-surface-2",
        link: "h-auto rounded-none bg-transparent p-0 text-text-1 underline-offset-4 hover:underline",
        icon: "bg-transparent text-text-1 hover:bg-surface-2",
        destructive: "bg-bad text-kb-white",
      },
      size: { default: "h-[52px] px-6", compact: "h-11 px-5 text-small", icon: "size-11 p-0" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";
export { Button, buttonVariants };
