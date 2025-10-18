// AI Model Configuration for OpenRouter
// This file contains the available AI companies and their top 3 models

export interface AIModel {
  id: string; // OpenRouter model ID
  name: string; // Display name
  description: string; // Short description
}

export interface AICompany {
  id: string;
  name: string;
  label: string;
  models: AIModel[];
}

export const AI_COMPANIES: Record<string, AICompany> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    label: "OpenAI",
    models: [
      {
        id: "openai/gpt-4o",
        name: "GPT-4o",
        description: "Most advanced OpenAI model with vision"
      },
      {
        id: "openai/gpt-4-turbo",
        name: "GPT-4 Turbo",
        description: "Fast and powerful GPT-4"
      },
      {
        id: "openai/gpt-3.5-turbo",
        name: "GPT-3.5 Turbo",
        description: "Fast and cost-effective"
      }
    ]
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    label: "Anthropic",
    models: [
      {
        id: "anthropic/claude-sonnet-4.5",
        name: "Claude Sonnet 4.5",
        description: "Latest and most advanced Claude model"
      },
      {
        id: "anthropic/claude-3.7-sonnet",
        name: "Claude 3.7 Sonnet",
        description: "Enhanced Claude 3.5 with better performance"
      },
      {
        id: "anthropic/claude-3.5-sonnet",
        name: "Claude 3.5 Sonnet",
        description: "Fast and intelligent Claude model"
      }
    ]
  },
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    label: "Mistral",
    models: [
      {
        id: "mistralai/mistral-large",
        name: "Mistral Large",
        description: "Flagship model with top performance"
      },
      {
        id: "mistralai/mistral-medium",
        name: "Mistral Medium",
        description: "Balanced performance"
      },
      {
        id: "mistralai/mistral-small",
        name: "Mistral Small",
        description: "Fast and efficient"
      }
    ]
  },
  google: {
    id: "google",
    name: "Google",
    label: "Google",
    models: [
      {
        id: "google/gemini-pro-1.5",
        name: "Gemini 1.5 Pro",
        description: "Advanced reasoning with large context"
      },
      {
        id: "google/gemini-flash-1.5",
        name: "Gemini 1.5 Flash",
        description: "Fast and efficient"
      },
      {
        id: "google/gemini-pro",
        name: "Gemini Pro",
        description: "Versatile AI model"
      }
    ]
  }
};

// Helper to get default model for a company
export const getDefaultModel = (companyId: string): string => {
  return AI_COMPANIES[companyId]?.models[0]?.id || "anthropic/claude-3.5-sonnet";
};

// Helper to get model display name
export const getModelDisplayName = (modelId: string): string => {
  for (const company of Object.values(AI_COMPANIES)) {
    const model = company.models.find(m => m.id === modelId);
    if (model) return model.name;
  }
  return modelId;
};

// Helper to get company from model ID
export const getCompanyFromModelId = (modelId: string): string | null => {
  for (const company of Object.values(AI_COMPANIES)) {
    if (company.models.some(m => m.id === modelId)) {
      return company.id;
    }
  }
  return null;
};
