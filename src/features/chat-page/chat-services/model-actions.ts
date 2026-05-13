"use server";
import "server-only";

import { availableModels, ChatModelDescriptor } from "./model-registry";

export const GetAvailableModels = async (): Promise<ChatModelDescriptor[]> =>
  availableModels();
