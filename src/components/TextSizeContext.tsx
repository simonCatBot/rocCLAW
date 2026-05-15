// MIT License - Copyright (c) 2026 kiritigowda
// See LICENSE file for details.

"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const TEXT_SIZE_KEY = "rocclaw-text-size";

export type TextSize = "small" | "medium" | "large";

interface TextSizeContextValue {
  size: TextSize;
  setSize: (size: TextSize) => void;
}

const TextSizeContext = createContext<TextSizeContextValue | null>(null);

function getStoredSize(): TextSize {
  if (typeof window === "undefined") return "small";
  const stored = localStorage.getItem(TEXT_SIZE_KEY);
  if (stored === "small" || stored === "medium" || stored === "large") return stored;
  return "small";
}

function applySize(size: TextSize) {
  localStorage.setItem(TEXT_SIZE_KEY, size);
  // Apply data attribute to document element for CSS targeting
  document.documentElement.dataset.textSize = size;
}

// Initialize early to prevent flash
if (typeof document !== "undefined") {
  const stored = localStorage.getItem(TEXT_SIZE_KEY) as TextSize | null;
  if (stored && ["small", "medium", "large"].includes(stored)) {
    document.documentElement.dataset.textSize = stored;
  } else {
    document.documentElement.dataset.textSize = "small";
  }
}

/** Provider — wrap once at app root level */
export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [size, setSizeState] = useState<TextSize>(getStoredSize);

  const setSize = useCallback((newSize: TextSize) => {
    setSizeState(newSize);
    applySize(newSize);
  }, []);

  return (
    <TextSizeContext.Provider value={{ size, setSize }}>
      {children}
    </TextSizeContext.Provider>
  );
}

/** Read current text size — call from any component */
export function useTextSize(): TextSize {
  const ctx = useContext(TextSizeContext);
  if (!ctx) {
    // Fallback if not wrapped
    return getStoredSize();
  }
  return ctx.size;
}

/** Set text size — call from any component */
export function useSetTextSize(): (size: TextSize) => void {
  const ctx = useContext(TextSizeContext);
  if (!ctx) {
    // Fallback
    return applySize;
  }
  return ctx.setSize;
}
