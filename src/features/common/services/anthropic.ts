import { OpenAI } from "openai";

// Claude Opus 4.6 is provisioned as an Azure AI Foundry serverless endpoint.
// The endpoint exposes an OpenAI-compatible surface at
// `${AZURE_ANTHROPIC_API_ENDPOINT}/v1/chat/completions` and authenticates via
// the Azure-style `api-key` header rather than `Authorization: Bearer`.
//
// We point the OpenAI SDK at that surface so the rest of azurechat (streaming
// runner, token streaming, persistence) doesn't need to know which model
// produced the bytes.

export const AnthropicInstance = () => {
  const endpoint = process.env.AZURE_ANTHROPIC_API_ENDPOINT;
  const apiKey = process.env.AZURE_ANTHROPIC_API_KEY;

  if (!endpoint || !apiKey) {
    throw new Error(
      "Claude endpoint is not configured. Set AZURE_ANTHROPIC_API_ENDPOINT and AZURE_ANTHROPIC_API_KEY."
    );
  }

  return new OpenAI({
    apiKey,
    baseURL: `${endpoint.replace(/\/$/, "")}/v1`,
    defaultHeaders: { "api-key": apiKey },
  });
};
