"use server";
import "server-only";

import { ServerActionResponse } from "@/features/common/server-action-response";

// Extensions are disabled for the EU-Only-LLM tier. Always return an empty
// tool list so the chat-api never JSON.parses an extension payload or makes
// an outbound HTTP call to a third-party endpoint. See
// extensions-page/extension-services/extension-service.ts.
export const GetDynamicExtensions = async (_props: {
  extensionIds: string[];
}): Promise<ServerActionResponse<Array<any>>> => ({
  status: "OK",
  response: [],
});
