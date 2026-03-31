"use client";

import { useState, useEffect } from "react";

interface ModelOption {
  id: string;
  name: string;
}

interface ProviderConfig {
  id: string;
  name: string;
  models: ModelOption[];
}

interface ModelSelectorProps {
  providerId: string;
  modelId: string;
  onChangeProvider: (id: string) => void;
  onChangeModel: (id: string) => void;
}

export default function ModelSelector({
  providerId,
  modelId,
  onChangeProvider,
  onChangeModel,
}: ModelSelectorProps) {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => {
        if (data.providers?.length > 0) {
          setProviders(data.providers);
        }
      })
      .catch(() => {});
  }, []);

  const currentProvider = providers.find((p) => p.id === providerId);
  const currentModel = currentProvider?.models.find((m) => m.id === modelId);
  const displayName = currentModel?.name || modelId.split("/").pop() || "モデル選択";

  if (providers.length === 0) {
    return (
      <span className="text-xs text-terminal-muted px-2 py-1">
        {displayName}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-terminal-border rounded-lg text-terminal-muted hover:text-terminal-accent hover:border-terminal-accent transition-colors"
      >
        <span className="w-2 h-2 rounded-full bg-terminal-green" />
        {displayName}
        <span className="text-[10px]">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-terminal-surface border border-terminal-border rounded-lg shadow-xl overflow-hidden">
            {providers.map((provider) => (
              <div key={provider.id}>
                <div className="px-3 py-1.5 text-[10px] font-bold text-terminal-muted uppercase tracking-wider bg-terminal-bg">
                  {provider.name}
                </div>
                {provider.models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onChangeProvider(provider.id);
                      onChangeModel(model.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-terminal-border/30 transition-colors ${
                      model.id === modelId
                        ? "text-terminal-accent"
                        : "text-terminal-text"
                    }`}
                  >
                    {model.name}
                    {model.id === modelId && (
                      <span className="ml-2 text-xs text-terminal-green">✓</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
