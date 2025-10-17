"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Check, Sparkles } from "lucide-react";
import { AI_COMPANIES, getModelDisplayName, getCompanyFromModelId } from "@/lib/models";

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModel, onModelChange, disabled = false }: ModelSelectorProps) {
  const currentCompanyId = getCompanyFromModelId(selectedModel);
  const currentCompany = currentCompanyId ? AI_COMPANIES[currentCompanyId] : null;
  const currentModel = currentCompany?.models.find(m => m.id === selectedModel);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full min-w-[180px] justify-between"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-medium">
              {currentModel?.name || "Select Model"}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {Object.values(AI_COMPANIES).map((company) => (
          <div key={company.id}>
            <DropdownMenuLabel className="text-xs font-semibold uppercase text-muted-foreground">
              {company.name}
            </DropdownMenuLabel>
            {company.models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => onModelChange(model.id)}
                className="cursor-pointer py-3"
              >
                <div className="flex items-start justify-between w-full gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{model.name}</span>
                      {selectedModel === model.id && (
                        <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {model.description}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
