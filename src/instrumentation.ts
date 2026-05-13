// MIT License - Copyright (c) 2026 kiritigowda
// See LICENSE file for details.

import { registerOTel } from "@vercel/otel";

export const register = () => {
  registerOTel({ serviceName: "openclaw-rocclaw" });
};
