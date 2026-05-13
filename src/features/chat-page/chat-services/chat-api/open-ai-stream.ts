import { AI_NAME } from "@/features/theme/theme-config";
import { ChatCompletionStreamingRunner } from "openai/resources/beta/chat/completions";
import { trackChatCompletion } from "@/features/common/services/app-insights";
import { CreateChatMessage } from "../chat-message-service";
import {
  AzureChatCompletion,
  AzureChatCompletionAbort,
  ChatThreadModel,
} from "../models";

export const OpenAIStream = (props: {
  runner: ChatCompletionStreamingRunner;
  chatThread: ChatThreadModel;
  modelLabel?: string;
}) => {
  const encoder = new TextEncoder();

  const { runner, chatThread } = props;
  const startedAt = Date.now();
  const telemetryModel =
    props.modelLabel ||
    process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME ||
    "gpt";

  const readableStream = new ReadableStream({
    async start(controller) {
      const streamResponse = (event: string, value: string) => {
        controller.enqueue(encoder.encode(`event: ${event} \n`));
        controller.enqueue(encoder.encode(`data: ${value} \n\n`));
      };

      let lastMessage = "";

      runner
        .on("content", (content) => {
          const completion = runner.currentChatCompletionSnapshot;

          if (completion) {
            const response: AzureChatCompletion = {
              type: "content",
              response: completion,
            };
            lastMessage = completion.choices[0].message.content ?? "";
            streamResponse(response.type, JSON.stringify(response));
          }
        })
        .on("functionCall", async (functionCall) => {
          await CreateChatMessage({
            name: functionCall.name,
            content: functionCall.arguments,
            role: "function",
            chatThreadId: chatThread.id,
          });

          const response: AzureChatCompletion = {
            type: "functionCall",
            response: functionCall,
          };
          streamResponse(response.type, JSON.stringify(response));
        })
        .on("functionCallResult", async (functionCallResult) => {
          const response: AzureChatCompletion = {
            type: "functionCallResult",
            response: functionCallResult,
          };
          await CreateChatMessage({
            name: "tool",
            content: functionCallResult,
            role: "function",
            chatThreadId: chatThread.id,
          });
          streamResponse(response.type, JSON.stringify(response));
        })
        .on("abort", (error) => {
          trackChatCompletion({
            model: telemetryModel,
            chatThreadId: chatThread.id,
            latencyMs: Date.now() - startedAt,
            status: "abort",
          });
          const response: AzureChatCompletionAbort = {
            type: "abort",
            response: "Chat aborted",
          };
          streamResponse(response.type, JSON.stringify(response));
          controller.close();
        })
        .on("error", async (error) => {
          console.log("🔴 error", error);
          trackChatCompletion({
            model: telemetryModel,
            chatThreadId: chatThread.id,
            latencyMs: Date.now() - startedAt,
            status: "error",
            errorMessage: error.message,
          });
          const response: AzureChatCompletion = {
            type: "error",
            response: error.message,
          };

          // if there is an error still save the last message even though it is not complete
          await CreateChatMessage({
            name: AI_NAME,
            content: lastMessage,
            role: "assistant",
            chatThreadId: props.chatThread.id,
          });

          streamResponse(response.type, JSON.stringify(response));
          controller.close();
        })
        .on("finalContent", async (content: string) => {
          await CreateChatMessage({
            name: AI_NAME,
            content: content,
            role: "assistant",
            chatThreadId: props.chatThread.id,
          });

          const finalSnapshot = runner.currentChatCompletionSnapshot;
          const usage = (finalSnapshot as any)?.usage;
          trackChatCompletion({
            model: telemetryModel,
            chatThreadId: chatThread.id,
            promptTokens: usage?.prompt_tokens,
            completionTokens: usage?.completion_tokens,
            totalTokens: usage?.total_tokens,
            latencyMs: Date.now() - startedAt,
            status: "success",
          });

          const response: AzureChatCompletion = {
            type: "finalContent",
            response: content,
          };
          streamResponse(response.type, JSON.stringify(response));
          controller.close();
        });
    },
  });

  return readableStream;
};
