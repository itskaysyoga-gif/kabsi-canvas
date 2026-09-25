import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("inline-flex h-[52px] cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-pill px-6 text-base font-bold transition-[background-color,color,transform] focus-visible:outline-2 focus-visible:outline-kb-black focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0", {
  variants: {
    variant: {
      default: "bg-kb-yellow text-kb-black hover:bg-kb-yellow-pressed active:translate-y-px active:bg-kb-yellow-pressed",
      outline: "border-2 border-kb-black bg-transparent text-kb-black hover:bg-kb-sand active:translate-y-px",
      ghost: "bg-transparent text-kb-black hover:bg-kb-sand",
      link: "h-auto rounded-none bg-transparent p-0 text-kb-black underline-offset-4 hover:underline",
      icon: "bg-transparent text-kb-black hover:bg-kb-sand",
      destructive: "bg-kb-red text-kb-white",
      secondary: "bg-kb-black text-kb-white",
    },
    size: { default: "h-[52px] px-6", compact: "h-11 px-5 text-sm", icon: "size-11 p-0" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => { const Comp = asChild ? Slot : "button"; return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />; });
Button.displayName = "Button";
export { Button, buttonVariants };
