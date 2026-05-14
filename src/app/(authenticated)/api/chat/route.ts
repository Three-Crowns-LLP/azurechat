import { ChatAPIEntry } from "@/features/chat-page/chat-services/chat-api/chat-api";
import { UserPrompt } from "@/features/chat-page/chat-services/models";
import { z } from "zod";

const userPromptSchema = z.object({
  id: z.string().min(1),
  message: z.string(),
});

// Cap the base64-encoded image at ~6 MB. Azure OpenAI vision rejects
// payloads larger than ~20 MB and the App Service request limit is 30 MB;
// the cap keeps Cosmos document sizes and per-request egress bounded.
const MAX_IMAGE_BASE64_BYTES = 6 * 1024 * 1024;

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new Response("Invalid form data", { status: 400 });
  }

  const content = formData.get("content");
  if (typeof content !== "string") {
    return new Response("Missing 'content' field", { status: 400 });
  }

  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(content);
  } catch {
    return new Response("'content' is not valid JSON", { status: 400 });
  }

  const parsed = userPromptSchema.safeParse(parsedContent);
  if (!parsed.success) {
    return new Response("'content' failed validation", { status: 400 });
  }

  const multimodalImage = formData.get("image-base64");
  if (multimodalImage !== null && typeof multimodalImage !== "string") {
    return new Response("'image-base64' must be a string", { status: 400 });
  }
  if (
    typeof multimodalImage === "string" &&
    multimodalImage.length > MAX_IMAGE_BASE64_BYTES
  ) {
    return new Response("'image-base64' exceeds the size limit", {
      status: 413,
    });
  }

  const userPrompt: UserPrompt = {
    id: parsed.data.id,
    message: parsed.data.message,
    multimodalImage: multimodalImage ?? "",
  };

  try {
    return await ChatAPIEntry(userPrompt, req.signal);
  } catch (error) {
    console.error("ChatAPIEntry failed", error);
    return new Response("Chat request failed", { status: 500 });
  }
}
