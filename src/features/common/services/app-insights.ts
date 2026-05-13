import "server-only";

// Lazy Application Insights client wired off APPLICATIONINSIGHTS_CONNECTION_STRING.
// Same env var as codeless attach, so the bicep doesn't need a second setting.
// trackChatCompletion emits one custom event per turn carrying model + token
// counts + latency so dashboards can break down usage by GPT vs Claude.

import type * as AppInsightsType from "applicationinsights";

let client: AppInsightsType.TelemetryClient | null = null;
let initialised = false;

const getClient = (): AppInsightsType.TelemetryClient | null => {
  if (initialised) return client;
  initialised = true;

  const conn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!conn) return null;

  // Codeless attach owns the auto-instrumentation. The SDK is loaded here only
  // for the custom-event API; don't call start() to avoid double-collection.
  const appInsights = require("applicationinsights") as typeof AppInsightsType;
  client = new appInsights.TelemetryClient(conn);
  return client;
};

export interface ChatCompletionTelemetry {
  model: string;
  chatThreadId: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  status: "success" | "error" | "abort";
  errorMessage?: string;
}

export const trackChatCompletion = (event: ChatCompletionTelemetry): void => {
  const c = getClient();
  if (!c) return;

  try {
    c.trackEvent({
      name: "ChatCompletion",
      properties: {
        model: event.model,
        chatThreadId: event.chatThreadId,
        status: event.status,
        errorMessage: event.errorMessage ?? "",
      },
      measurements: {
        promptTokens: event.promptTokens ?? 0,
        completionTokens: event.completionTokens ?? 0,
        totalTokens:
          event.totalTokens ??
          (event.promptTokens ?? 0) + (event.completionTokens ?? 0),
        latencyMs: event.latencyMs,
      },
    });

    c.trackMetric({
      name: `chat.latency.${event.model}`,
      value: event.latencyMs,
    });
    if (event.promptTokens != null) {
      c.trackMetric({
        name: `chat.prompt_tokens.${event.model}`,
        value: event.promptTokens,
      });
    }
    if (event.completionTokens != null) {
      c.trackMetric({
        name: `chat.completion_tokens.${event.model}`,
        value: event.completionTokens,
      });
    }
  } catch {
    // Telemetry must never break a chat turn.
  }
};
