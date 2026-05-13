"use server";
import "server-only";

import { ChatThreadModel } from "@/features/chat-page/chat-services/models";
import { ServerActionResponse } from "@/features/common/server-action-response";
import { ExtensionModel } from "./models";

// Extensions are disabled for the EU-Only-LLM tier. The upstream feature
// persists a JSON-serialised function payload that the chat API JSON.parses
// and hands to the model's tool-call loop — an unvetted execution sink that
// also calls out to third-party HTTP endpoints, which would break the closed
// sub-processor list.
//
// All read paths return empty / not-found so any pre-existing Cosmos records
// are inert. All write paths refuse with UNAUTHORIZED. The dynamic-extension
// loader is short-circuited separately to return an empty tool list.

const disabled = <T = any>(): ServerActionResponse<T> => ({
  status: "UNAUTHORIZED",
  errors: [{ message: "Extensions are disabled in this deployment." }],
});

export const FindExtensionByID = async (
  _id: string
): Promise<ServerActionResponse<ExtensionModel>> => ({
  status: "NOT_FOUND",
  errors: [{ message: "Extensions are disabled in this deployment." }],
});

export const CreateExtension = async (
  _inputModel: ExtensionModel
): Promise<ServerActionResponse<ExtensionModel>> => disabled();

export const EnsureExtensionOperation = async (
  _id: string
): Promise<ServerActionResponse<ExtensionModel>> => disabled();

export const FindSecureHeaderValue = async (
  _headerId: string
): Promise<ServerActionResponse<string>> => disabled();

export const DeleteExtension = async (
  _id: string
): Promise<ServerActionResponse<ExtensionModel>> => disabled();

export const UpdateExtension = async (
  _inputModel: ExtensionModel
): Promise<ServerActionResponse<ExtensionModel>> => disabled();

export const FindAllExtensionForCurrentUser = async (): Promise<
  ServerActionResponse<Array<ExtensionModel>>
> => ({
  status: "OK",
  response: [],
});

export const CreateChatWithExtension = async (
  _extensionId: string
): Promise<ServerActionResponse<ChatThreadModel>> => disabled();
