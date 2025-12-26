/**
 * Usage metadata for tracking token consumption and costs
 */
export interface MonitoringAiUsageMetadata {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  /** Cost for input tokens in USD (optional, calculated when pricing is provided) */
  inputCost?: number;
  /** Cost for output tokens in USD (optional, calculated when pricing is provided) */
  outputCost?: number;
  /** Total cost in USD (optional, calculated when pricing is provided) */
  totalCost?: number;
}

/**
 * Per-node usage tracking entry
 */
export interface MonitoringAiNodeUsageEntry {
  id: string;
  /** Model name used for this node execution */
  modelName: string;
  /** Name of the graph node that generated this usage */
  nodeName: string;
  /** Method used to invoke the model (e.g., 'invokeModel', 'invokeAgent') */
  invokeMethod: string;
  /** Timestamp when this node executed */
  timestamp: string;
  /** Iteration number for agent loops (optional) */
  iteration?: number;
  /** Token usage for this specific node execution */
  usageMetadata: MonitoringAiUsageMetadata;
}

/**
 * Pricing configuration for a model
 */
export interface ModelPricing {
  /** Cost per 1M input tokens in USD */
  inputTokensPer1M: number;
  /** Cost per 1M output tokens in USD */
  outputTokensPer1M: number;
  /** Date when pricing was last verified/updated (ISO 8601 format) */
  lastUpdated?: string;
}

/**
 * Common AI models with known pricing
 */
export enum CommonAiModel {
  // OpenAI Models
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4 = 'gpt-4',
  GPT_4_32K = 'gpt-4-32k',
  GPT_35_TURBO = 'gpt-3.5-turbo',
  GPT_35_TURBO_16K = 'gpt-3.5-turbo-16k',
  GPT_4O = 'gpt-4o',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4_1 = 'gpt-4.1',
  GPT_4_1_MINI = 'gpt-4.1-mini',
  GPT_5_1 = 'gpt-5.1',

  // OpenAI Embedding Models
  TEXT_EMBEDDING_ADA_002 = 'text-embedding-ada-002',
  TEXT_EMBEDDING_3_SMALL = 'text-embedding-3-small',
  TEXT_EMBEDDING_3_LARGE = 'text-embedding-3-large',

  // Anthropic Claude Models
  CLAUDE_3_OPUS = 'claude-3-opus',
  CLAUDE_3_SONNET = 'claude-3-sonnet',
  CLAUDE_35_SONNET = 'claude-3.5-sonnet',
  CLAUDE_3_HAIKU = 'claude-3-haiku',

  // Azure OpenAI (uses same models but different endpoints)
  AZURE_GPT_4 = 'azure-gpt-4',
  AZURE_GPT_35_TURBO = 'azure-gpt-3.5-turbo',

  // Custom/Unknown
  CUSTOM = 'custom',
}

const latestUpdate = '2025-12-25';

/**
 * Registry of common model pricings (as of December 2024)
 * Prices are per 1M tokens in USD
 */
export const COMMON_MODEL_PRICING: Record<CommonAiModel, ModelPricing> = {
  // OpenAI GPT-4 Models
  [CommonAiModel.GPT_4_TURBO]: {
    inputTokensPer1M: 10.0,
    outputTokensPer1M: 30.0,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.GPT_4]: {
    inputTokensPer1M: 30.0,
    outputTokensPer1M: 60.0,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.GPT_4_32K]: {
    inputTokensPer1M: 60.0,
    outputTokensPer1M: 120.0,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.GPT_4O]: {
    inputTokensPer1M: 5.0,
    outputTokensPer1M: 15.0,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.GPT_4O_MINI]: {
    inputTokensPer1M: 0.15,
    outputTokensPer1M: 0.6,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.GPT_4_1]: {
    inputTokensPer1M: 5.0,
    outputTokensPer1M: 15.0,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.GPT_4_1_MINI]: {
    inputTokensPer1M: 0.15,
    outputTokensPer1M: 0.6,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.GPT_5_1]: {
    inputTokensPer1M: 10.0,
    outputTokensPer1M: 30.0,
    lastUpdated: latestUpdate,
  },

  // OpenAI GPT-3.5 Models
  [CommonAiModel.GPT_35_TURBO]: {
    inputTokensPer1M: 0.5,
    outputTokensPer1M: 1.5,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.GPT_35_TURBO_16K]: {
    inputTokensPer1M: 3.0,
    outputTokensPer1M: 4.0,
    lastUpdated: latestUpdate,
  },

  // OpenAI Embedding Models (no output tokens, only input)
  [CommonAiModel.TEXT_EMBEDDING_ADA_002]: {
    inputTokensPer1M: 0.1,
    outputTokensPer1M: 0.0,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.TEXT_EMBEDDING_3_SMALL]: {
    inputTokensPer1M: 0.02,
    outputTokensPer1M: 0.0,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.TEXT_EMBEDDING_3_LARGE]: {
    inputTokensPer1M: 0.13,
    outputTokensPer1M: 0.0,
    lastUpdated: latestUpdate,
  },

  // Anthropic Claude Models
  [CommonAiModel.CLAUDE_3_OPUS]: {
    inputTokensPer1M: 15.0,
    outputTokensPer1M: 75.0,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.CLAUDE_3_SONNET]: {
    inputTokensPer1M: 3.0,
    outputTokensPer1M: 15.0,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.CLAUDE_35_SONNET]: {
    inputTokensPer1M: 3.0,
    outputTokensPer1M: 15.0,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.CLAUDE_3_HAIKU]: {
    inputTokensPer1M: 0.25,
    outputTokensPer1M: 1.25,
    lastUpdated: latestUpdate,
  },

  // Azure OpenAI (typically same pricing as OpenAI, but can vary by region)
  [CommonAiModel.AZURE_GPT_4]: {
    inputTokensPer1M: 30.0,
    outputTokensPer1M: 60.0,
    lastUpdated: latestUpdate,
  },
  [CommonAiModel.AZURE_GPT_35_TURBO]: {
    inputTokensPer1M: 0.5,
    outputTokensPer1M: 1.5,
    lastUpdated: latestUpdate,
  },

  // Custom model - default placeholder pricing
  [CommonAiModel.CUSTOM]: {
    inputTokensPer1M: 0.0,
    outputTokensPer1M: 0.0,
    lastUpdated: latestUpdate,
  },
};

/**
 * Get pricing for a common model
 * @param model The model name or CommonAiModel enum value
 * @returns ModelPricing if found, undefined otherwise
 */
export function getModelPricing(model: string | CommonAiModel): ModelPricing | undefined {
  return COMMON_MODEL_PRICING[model as CommonAiModel];
}
