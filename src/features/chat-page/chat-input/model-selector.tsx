"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/features/ui/select";
import { useEffect, useState } from "react";
import { GetAvailableModels } from "../chat-services/model-actions";
import { ChatModelDescriptor } from "../chat-services/model-registry";
import { ChatModelId } from "../chat-services/models";
import { chatStore, useChat } from "../chat-store";

export const ModelSelector = () => {
  const { currentModel } = useChat();
  const [models, setModels] = useState<ChatModelDescriptor[]>([]);

  useEffect(() => {
    GetAvailableModels().then(setModels);
  }, []);

  if (models.length <= 1) return null;

  return (
    <Select
      value={currentModel}
      onValueChange={(value) => chatStore.updateModel(value as ChatModelId)}
    >
      <SelectTrigger
        aria-label="Model"
        className="h-8 w-44 text-xs"
      >
        <SelectValue placeholder="Model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
