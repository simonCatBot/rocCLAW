// MIT License - Copyright (c) 2026 SimonCatBot
// See LICENSE file for details.

"use client";

import { type ReactNode } from "react";
import { AvatarModeProvider } from "@/components/AvatarModeContext";
import { TextSizeProvider } from "@/components/TextSizeContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AvatarModeProvider>
      <TextSizeProvider>{children}</TextSizeProvider>
    </AvatarModeProvider>
  );
}
