// MIT License - Copyright (c) 2026 SimonCatBot
// See LICENSE file for details.

type GatewayStateVersion = {
  presence: number;
  health: number;
};

export type EventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: GatewayStateVersion;
};

export type ControlFrame = {
  type: "control";
  action: string;
  payload?: unknown;
};

export type GatewayFrame = EventFrame | ControlFrame;

export function parseGatewayFrame(raw: string): GatewayFrame | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "type" in parsed) {
      if (parsed.type === "event") {
        return parsed as EventFrame;
      }
      if (parsed.type === "control") {
        return parsed as ControlFrame;
      }
    }
    return null;
  } catch {
    return null;
  }
}
