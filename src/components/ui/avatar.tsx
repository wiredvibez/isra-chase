import * as React from "react";
import { cn, hashIndex, initialsOf } from "@/lib/utils";

const palette = [
  "bg-brand-500 text-white",
  "bg-accent-500 text-white",
  "bg-[#6b5bd2] text-white",
  "bg-[#d25b9a] text-white",
  "bg-[#2f8ad2] text-white",
  "bg-[#d2a12f] text-[#2b2000]",
  "bg-[#3aa76d] text-white",
  "bg-[#c0553a] text-white",
];

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const tone = palette[hashIndex(name || "?", palette.length)];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ring-2 ring-surface",
        sizes[size],
        !src && tone,
        className,
      )}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
