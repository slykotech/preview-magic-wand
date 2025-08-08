import React from "react";
import { cn } from "@/lib/utils";

interface RouteTransitionProps {
  children: React.ReactNode;
  className?: string;
}

// Consistent page transition wrapper using design-system animations
// Uses Tailwind's extended animations (animate-enter) defined in theme
export default function RouteTransition({ children, className }: RouteTransitionProps) {
  return (
    <div
      className={cn(
        // Smooth, consistent page entry animation; respects reduced motion
        "animate-enter motion-reduce:animate-none",
        // Prevent layout jumps on short pages
        "min-h-screen",
        className
      )}
      role="main"
    >
      {children}
    </div>
  );
}
