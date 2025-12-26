import {
  MonitoringAiUsageMetadata,
  MonitoringAiNodeUsageEntry,
  ModelPricing,
  getModelPricing,
} from '@syspons/monitoring-ai-common';
import { randomUUID } from 'crypto';
import type { Tiktoken } from 'tiktoken';

/**
 * Cost breakdown result
 */
export interface CostBreakdown {
  /** Total cost in USD */
  totalCost: number;
  /** Input tokens cost in USD */
  inputCost: number;
  /** Output tokens cost in USD */
  outputCost: number;
  /** Total input tokens */
  inputTokens: number;
  /** Total output tokens */
  outputTokens: number;
  /** Total tokens */
  totalTokens: number;
}

/**
 * Per-node cost breakdown
 */
export interface NodeCostBreakdown extends CostBreakdown {
  /** Node name */
  nodeName: string;
  /** Timestamp */
  timestamp: string;
  /** Iteration number (optional) */
  iteration?: number;
}

/**
 * Controller for token usage calculations and cost tracking
 */
export class TokensController {
  private pricing: ModelPricing;
  private modelName: string;
  private usageEntries: MonitoringAiNodeUsageEntry[] = [];

  /**
   * Create a TokensController instance with model name
   * Pricing is automatically looked up from the common model pricing registry.
   * If the model is not found in the registry, provide custom pricing via setPricing().
   * @param modelName Name of the model (e.g., 'gpt-4o', 'claude-3.5-sonnet')
   * @param customPricing Optional custom pricing if model is not in registry
   */
  constructor(modelName: string, customPricing?: ModelPricing) {
    this.modelName = modelName;

    // Try to get pricing from registry
    const registryPricing = getModelPricing(modelName);

    if (registryPricing) {
      this.pricing = registryPricing;
    } else if (customPricing) {
      this.pricing = customPricing;
    } else {
      // Default to zero pricing if not found
      console.warn(
        `Model "${modelName}" not found in pricing registry. Using zero pricing. ` +
          `Call setPricing() to set custom pricing.`
      );
      this.pricing = { inputTokensPer1M: 0, outputTokensPer1M: 0 };
    }
  }

  /**
   * Get the current pricing configuration
   */
  getPricing(): ModelPricing {
    return { ...this.pricing };
  }

  /**
   * Update the pricing configuration
   */
  setPricing(pricing: ModelPricing): void {
    this.pricing = pricing;
  }

  /**
   * Get the current model name
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Update the model name
   */
  setModelName(modelName: string): void {
    this.modelName = modelName;
  }

  /**
   * Count tokens in text array using tiktoken encoding
   * Falls back to character-based estimation if encoding not provided
   * @param texts Array of text strings to count tokens for
   * @param encoding Optional tiktoken encoding instance
   * @returns Total token count
   */
  countTokens(texts: string[], encoding?: Tiktoken | null): number {
    if (!encoding) {
      // Fallback estimation: ~4 characters per token
      return texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);
    }

    let total = 0;
    for (const text of texts) {
      total += encoding.encode(text).length;
    }
    return total;
  }

  /**
   * Create a NodeUsageEntry from usage metadata with cost calculation
   */
  createUsageEntry(
    nodeName: string,
    invokeMethod: string,
    usageMetadata: MonitoringAiUsageMetadata,
    iteration?: number
  ): MonitoringAiNodeUsageEntry {
    const cost = this.calculateCostFromMetadata(usageMetadata);
    return {
      id: randomUUID(),
      modelName: this.modelName,
      nodeName,
      invokeMethod,
      timestamp: new Date().toISOString(),
      iteration,
      usageMetadata: {
        ...usageMetadata,
        inputCost: cost.inputCost,
        outputCost: cost.outputCost,
        totalCost: cost.totalCost,
      },
    };
  }

  /**
   * Record usage by creating an entry and storing it internally
   * @param nodeName Name of the graph node
   * @param invokeMethod Method used to invoke (e.g., 'invokeModel', 'addDocuments')
   * @param usageMetadata Token usage metadata
   * @param iteration Optional iteration number for agent loops
   */
  recordUsage(
    nodeName: string,
    invokeMethod: string,
    usageMetadata: MonitoringAiUsageMetadata,
    iteration?: number
  ): void {
    const entry = this.createUsageEntry(nodeName, invokeMethod, usageMetadata, iteration);
    this.usageEntries.push(entry);
  }

  /**
   * Calculate cost from usage metadata
   */
  private calculateCostFromMetadata(usage: MonitoringAiUsageMetadata): {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  } {
    const inputCost = (usage.input_tokens / 1_000_000) * this.pricing.inputTokensPer1M;
    const outputCost = (usage.output_tokens / 1_000_000) * this.pricing.outputTokensPer1M;
    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }

  /**
   * Calculate total usage from usagePerNode array
   */
  getTotalUsage(usagePerNode?: MonitoringAiNodeUsageEntry[]): MonitoringAiUsageMetadata {
    if (!usagePerNode || usagePerNode.length === 0) {
      return { input_tokens: 0, output_tokens: 0, total_tokens: 0 };
    }

    return usagePerNode.reduce(
      (total, entry) => ({
        input_tokens: total.input_tokens + entry.usageMetadata.input_tokens,
        output_tokens: total.output_tokens + entry.usageMetadata.output_tokens,
        total_tokens: total.total_tokens + entry.usageMetadata.total_tokens,
      }),
      { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
    );
  }

  /**
   * Calculate cost based on token usage and model pricing
   */
  calculateCost(usage: MonitoringAiUsageMetadata, pricing?: ModelPricing): CostBreakdown {
    const pricingToUse = pricing || this.pricing;
    const inputCost = (usage.input_tokens / 1_000_000) * pricingToUse.inputTokensPer1M;
    const outputCost = (usage.output_tokens / 1_000_000) * pricingToUse.outputTokensPer1M;

    return {
      totalCost: inputCost + outputCost,
      inputCost,
      outputCost,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.total_tokens,
    };
  }

  /**
   * Calculate total cost from usagePerNode array
   */
  getTotalCost(
    usagePerNode: MonitoringAiNodeUsageEntry[] | undefined,
    pricing?: ModelPricing
  ): CostBreakdown {
    const totalUsage = this.getTotalUsage(usagePerNode);
    return this.calculateCost(totalUsage, pricing);
  }

  /**
   * Get per-node cost breakdown
   */
  getPerNodeCosts(
    usagePerNode: MonitoringAiNodeUsageEntry[] | undefined,
    pricing?: ModelPricing
  ): NodeCostBreakdown[] {
    if (!usagePerNode || usagePerNode.length === 0) {
      return [];
    }

    return usagePerNode.map((entry) => ({
      nodeName: entry.nodeName,
      timestamp: entry.timestamp,
      iteration: entry.iteration,
      ...this.calculateCost(entry.usageMetadata, pricing),
    }));
  }

  /**
   * Get usage breakdown by node name (aggregates multiple executions of same node)
   */
  getUsageByNode(
    usagePerNode?: MonitoringAiNodeUsageEntry[]
  ): Map<string, MonitoringAiUsageMetadata> {
    const breakdown = new Map<string, MonitoringAiUsageMetadata>();

    if (!usagePerNode) {
      return breakdown;
    }

    for (const entry of usagePerNode) {
      const existing = breakdown.get(entry.nodeName);
      if (existing) {
        breakdown.set(entry.nodeName, {
          input_tokens: existing.input_tokens + entry.usageMetadata.input_tokens,
          output_tokens: existing.output_tokens + entry.usageMetadata.output_tokens,
          total_tokens: existing.total_tokens + entry.usageMetadata.total_tokens,
        });
      } else {
        breakdown.set(entry.nodeName, { ...entry.usageMetadata });
      }
    }

    return breakdown;
  }

  /**
   * Format cost as USD string
   */
  static formatCost(cost: number): string {
    return `$${cost.toFixed(6)}`;
  }

  /**
   * Format token count with comma separators
   */
  static formatTokens(tokens: number): string {
    return tokens.toLocaleString();
  }

  /**
   * Get summary string of usage and cost
   */
  getSummary(
    usagePerNode: MonitoringAiNodeUsageEntry[] | undefined,
    pricing?: ModelPricing
  ): string {
    const cost = this.getTotalCost(usagePerNode, pricing);
    return `Tokens: ${TokensController.formatTokens(cost.totalTokens)} (${TokensController.formatTokens(cost.inputTokens)} in, ${TokensController.formatTokens(cost.outputTokens)} out) | Cost: ${TokensController.formatCost(cost.totalCost)}`;
  }

  /**
   * Get all stored usage entries
   */
  getUsageEntries(): MonitoringAiNodeUsageEntry[] {
    return [...this.usageEntries];
  }

  /**
   * Clear all stored usage entries
   */
  clearUsageEntries(): void {
    this.usageEntries = [];
  }

  /**
   * Get count of stored usage entries
   */
  getUsageEntryCount(): number {
    return this.usageEntries.length;
  }
}
