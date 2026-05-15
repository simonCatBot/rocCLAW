// MIT License - Copyright (c) 2026 kiritigowda
// See LICENSE file for details.

"use client";

import { useEffect, useRef, useState } from "react";
// Import icons
import { useTextSize, useSetTextSize } from "@/components/TextSizeContext";
import type { TextSize } from "@/components/TextSizeContext";

export type { TextSize } from "@/components/TextSizeContext";

const SIZES: { id: TextSize; label: string; description: string }[] = [
  {
    id: "small",
    label: "Small",
    description: "Default text size",
  },
  {
    id: "medium",
    label: "Medium",
    description: "Slightly larger text",
  },
  {
    id: "large",
    label: "Large",
    description: "Larger text for readability",
  },
];

// Custom icons for text sizes - "A" letter scaled to represent sizes
function SmallTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Small "A" - shorter and narrower */}
      <path d="M12 10L9 17h1.2l0.6-1.5h3.4l0.6 1.5H16l-3-7h-1z" />
      <path d="M10.5 14h3" />
    </svg>
  );
}

function MediumTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Medium "A" - fills the space */}
      <path d="M12 5l-4.5 12h1.8l1.1-3h5.2l1.1 3h1.8L13 5h-1z" />
      <path d="M10.2 12h3.6" />
    </svg>
  );
}

function LargeTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Large "A" - tall and prominent */}
      <path d="M12 3l-5 15.5h2l1.25-4h5.5l1.25 4h2L14 3h-2z" />
      <path d="M9.75 12.5h4.5" />
    </svg>
  );
}

export function TextSizeToggle() {
  const [open, setOpen] = useState(false);
  const activeSize = useTextSize();
  const setSize = useSetTextSize();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSelect = (id: TextSize) => {
    setSize(id);
    setOpen(false);
  };

  const active = SIZES.find((s) => s.id === activeSize)!;

  const iconMap: Record<TextSize, React.ReactNode> = {
    small: <SmallTextIcon className="h-3.5 w-3.5" />,
    medium: <MediumTextIcon className="h-3.5 w-3.5" />,
    large: <LargeTextIcon className="h-3.5 w-3.5" />,
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-2 text-muted-foreground hover:border-border/80 hover:text-foreground"
        aria-label={`Text size: ${active.label}`}
        aria-expanded={open}
        aria-haspopup="true"
        title={`Text size: ${active.label}`}
      >
        {iconMap[activeSize]}
      </button>

      {open ? (
        <div role="menu" aria-label="Text sizes" className="ui-card absolute bottom-full right-0 z-[300] mb-2 min-w-52 p-2">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Text size
          </p>
          <div className="flex flex-col gap-1">
            {SIZES.map((size) => {
              const isActive = size.id === activeSize;
              return (
                <button
                  key={size.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleSelect(size.id)}
                  className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left text-xs transition-colors ${
                    isActive
                      ? "bg-surface-selected/20 text-foreground"
                      : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                  }`}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-surface-1">
                    {iconMap[size.id]}
                  </span>
                  <span className="flex flex-col">
                    <span className={isActive ? "font-semibold text-foreground" : ""}>
                      {size.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{size.description}</span>
                  </span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
