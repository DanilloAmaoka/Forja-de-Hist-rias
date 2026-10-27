import { useEffect } from "react";

export function useScrollIntoViewOnOpen(ref, active, block = "start") {
  useEffect(() => {
    if (!active) return undefined;

    const timeout = window.setTimeout(() => {
      ref.current?.scrollIntoView({
        behavior: "smooth",
        block,
        inline: "nearest",
      });
    }, 90);

    return () => window.clearTimeout(timeout);
  }, [active, block, ref]);
}
