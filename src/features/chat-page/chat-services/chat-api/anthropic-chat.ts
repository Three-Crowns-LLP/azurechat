"use server";
import "server-only";

import { AnthropicInstance } from "@/features/common/services/anthropic";
import { ChatCompletionStreamingRunner } from "openai/resources/beta/chat/completions";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { ChatThreadModel } from "../models";

// Streams a completion from the Foundry serverless Claude endpoint. Returns
// a ChatCompletionStreamingRunner so the existing OpenAIStream helper can
// consume it without branching: same content / abort / error / finalContent
// events fire either way.

export const AnthropicChatApi = (props: {
  chatThread: ChatThreadModel;
  userMessage: string;
  history: ChatCompletionMessageParam[];
  signal: AbortSignal;
}): ChatCompletionStreamingRunner => {
  const { userMessage, history, signal, chatThread } = props;

  const client = AnthropicInstance();
  const model =
    process.env.AZURE_ANTHROPIC_API_DEPLOYMENT_NAME || "claude-opus-4-6";

  return client.beta.chat.completions.stream(
    {
      model,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: chatThread.personaMessage },
        ...history,
        { role: "user", content: userMessage },
      ],
    },
    { signal }
  );
};
