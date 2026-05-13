import "server-only";

import { ChatModelId } from "./models";

export interface ChatModelDescriptor {
  id: ChatModelId;
  label: string;
  enabled: boolean;
}

const isEnabled = (value: string | undefined): boolean => {
  if (value === undefined) return true;
  return value.toLowerCase() !== "false";
};

const REGISTRY: ReadonlyArray<Omit<ChatModelDescriptor, "enabled"> & {
  envFlag: string;
}> = [
  { id: "gpt-5.4", label: "GPT-5.4", envFlag: "FEATURE_GPT_ENABLED" },
  {
    id: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    envFlag: "FEATURE_CLAUDE_ENABLED",
  },
];

export const availableModels = (): ChatModelDescriptor[] =>
  REGISTRY.filter((m) => isEnabled(process.env[m.envFlag])).map(
    ({ envFlag: _envFlag, ...rest }) => ({ ...rest, enabled: true })
  );

export const isModelEnabled = (id: ChatModelId): boolean => {
  const entry = REGISTRY.find((m) => m.id === id);
  if (!entry) return false;
  return isEnabled(process.env[entry.envFlag]);
};

export const defaultModel = (): ChatModelId | undefined =>
  availableModels()[0]?.id;
