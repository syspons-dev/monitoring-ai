import { CompiledStateGraph } from '@langchain/langgraph';

import { MonitoringAiBaseGraphStateType, RemoteGraphConfig } from '@syspons/monitoring-ai-common';

import { MonitoringAiBaseGraph, MonitoringAiBaseGraphInvokeParams } from '../index.js';
import { MonitoringGraphSettings } from '../../index.js';
import { MonitoringAiBaseGraphState } from '../../types/index.js';

/**
 * Remote Graph implementation that delegates to a remotely deployed graph via REST API.
 *
 * This class acts as a proxy to a remote graph service, sending requests and handling responses.
 * It maintains the same interface as other MonitoringAiBaseGraph implementations for consistency.
 */
export class MonitoringAiRemoteGraph extends MonitoringAiBaseGraph<MonitoringAiBaseGraphState> {
  // This is a proxy graph, so we don't compile a local graph
  graph: CompiledStateGraph<MonitoringAiBaseGraphState, Partial<MonitoringAiBaseGraphState>>;

  private remoteUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(settings: MonitoringGraphSettings, config: RemoteGraphConfig) {
    super(settings);

    this.remoteUrl = config.remoteUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000; // 30 seconds default

    // For remote graph, we don't need a local compiled graph
    // but we need to satisfy the abstract property requirement
    this.graph = null as any;
  }

  /**
   * Invokes the remote graph by sending a REST request
   */
  override async invokeGraph(
    params: MonitoringAiBaseGraphInvokeParams
  ): Promise<MonitoringAiBaseGraphStateType> {
    try {
      console.log(`Invoking remote graph at ${this.remoteUrl}`);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
        headers['X-API-Key'] = this.apiKey;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      const body = JSON.stringify({
        ...params.state,
        modelSettings: {
          modelName: this.settings.MODEL_NAME,
          maxTokens: this.settings.MODEL_MAX_TOKENS,
        },
      });

      const response = await fetch(this.remoteUrl, {
        signal: controller.signal,
        method: 'POST',
        headers,
        body,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Remote graph request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Validate the response has the expected structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response from remote graph: expected object');
      }

      // Normalize field names that may come in different casing from external APIs
      const normalizedResult = this.normalizeResponseKeys(result);

      // Validate required fields
      if (!normalizedResult.messages || !Array.isArray(normalizedResult.messages)) {
        throw new Error('Invalid response from remote graph: missing or invalid "messages" array');
      }

      return normalizedResult as MonitoringAiBaseGraphStateType;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Remote graph request timed out after ${this.timeout}ms`);
        }
        throw new Error(`Failed to invoke remote graph: ${error.message}`);
      }
      throw new Error('Failed to invoke remote graph: Unknown error');
    }
  }

  /**
   * Normalizes response keys to handle different casing conventions from external APIs.
   * Handles variations like: metadata/metaData/meta_data, structuredData/structured_data/starcturedData
   */
  private normalizeResponseKeys(result: any): any {
    const normalized: any = { ...result };

    // Normalize metadata field (handle: metaData, meta_data, metadata)
    const metadataKeys = ['metaData', 'meta_data', 'Metadata', 'MetaData'];
    for (const key of metadataKeys) {
      if (key in normalized && !('metadata' in normalized)) {
        normalized.metadata = normalized[key];
        delete normalized[key];
        break;
      }
    }

    // Normalize structuredData field (handle: structured_data, starcturedData, StructuredData)
    const structuredDataKeys = [
      'structured_data',
      'starcturedData',
      'StructuredData',
      'structureddata',
    ];
    for (const key of structuredDataKeys) {
      if (key in normalized && !('structuredData' in normalized)) {
        normalized.structuredData = normalized[key];
        delete normalized[key];
        break;
      }
    }

    // Validate and normalize messages array
    if (normalized.messages && Array.isArray(normalized.messages)) {
      normalized.messages = normalized.messages.map((msg: any) => {
        const normalizedMsg: any = { ...msg };

        // Normalize message metadata fields
        for (const key of metadataKeys) {
          if (key in normalizedMsg && !('response_metadata' in normalizedMsg)) {
            normalizedMsg.response_metadata = normalizedMsg[key];
            delete normalizedMsg[key];
            break;
          }
        }

        // Normalize additional_kwargs field (handle: additionalKwargs, additional_kwargs)
        const kwargsKeys = ['additionalKwargs', 'AdditionalKwargs'];
        for (const key of kwargsKeys) {
          if (key in normalizedMsg && !('additional_kwargs' in normalizedMsg)) {
            normalizedMsg.additional_kwargs = normalizedMsg[key];
            delete normalizedMsg[key];
            break;
          }
        }

        return normalizedMsg;
      });
    }

    return normalized;
  }

  START_NODE = (_state: MonitoringAiBaseGraphState): Partial<MonitoringAiBaseGraphState> => {
    // For remote graphs, nodes are handled by the remote service
    return {};
  };

  END_NODE = (_state: MonitoringAiBaseGraphState): Partial<MonitoringAiBaseGraphState> => {
    // For remote graphs, nodes are handled by the remote service
    return {};
  };
}
