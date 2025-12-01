import { CompiledStateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

import { MonitoringAiBaseGraphState } from '../types/index.js';
import { MonitoringGraphSettings } from '../utils';
import {
  MonitoringAiBaseGraphStateType,
  MonitoringAiDataFlowConfig,
} from '@syspons/monitoring-ai-common';
import { EmbeddingController } from '../controllers/embedding.controller.js';
import {
  convertToLangChainMessages,
  convertFromLangChainMessages,
} from '../utils/message-converter.js';

export interface MonitoringAiBaseGraphInvokeParams {
  state: MonitoringAiBaseGraphStateType;
  dataflowConfig?: MonitoringAiDataFlowConfig;
}

export abstract class MonitoringAiBaseGraph<T extends MonitoringAiBaseGraphState> {
  abstract graph: CompiledStateGraph<T, Partial<T>>;
  settings: MonitoringGraphSettings;
  model: ChatOpenAI;

  // Optional Data Flow Config. Will be set on every invoke if provided
  dataFlowConfig?: MonitoringAiDataFlowConfig;

  embeddingController: EmbeddingController;

  constructor(settings: MonitoringGraphSettings) {
    this.settings = settings;
    this.model = new ChatOpenAI({
      modelName: this.settings.MODEL_NAME,
      apiKey: this.settings.MODEL_API_KEY,
      configuration: {
        baseURL: this.settings.MODEL_BASE_URL,
        defaultQuery: { 'api-version': this.settings.MODEL_API_VERSION },
        defaultHeaders: { 'api-key': this.settings.MODEL_API_KEY },
      },
      maxRetries: parseInt(this.settings.MODEL_MAX_RETRIES, 10),
      timeout: parseInt(this.settings.MODEL_REQUEST_TIMEOUT, 10),
    });

    this.embeddingController = new EmbeddingController();
  }

  async invokeGraph(
    params: MonitoringAiBaseGraphInvokeParams
  ): Promise<MonitoringAiBaseGraphStateType> {
    try {
      this.dataFlowConfig = params.dataflowConfig;

      // Convert MonitoringAiMessage[] to LangChain BaseMessage[]
      const langchainMessages = convertToLangChainMessages(params.state.messages);

      // Invoke graph with converted messages
      const result = await this.graph.invoke({
        ...params.state,
        messages: langchainMessages,
      } as unknown as T);

      // Convert result back to MonitoringAiMessage[]
      const resultMessages = (result as any).messages;
      return {
        ...result,
        messages: convertFromLangChainMessages(resultMessages),
      } as MonitoringAiBaseGraphStateType;
    } catch (error) {
      throw new Error(
        `Failed to invoke graph: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Default Graph Nodes

  abstract START_NODE: (state: T) => Partial<T>;

  abstract END_NODE: (state: T) => Partial<T>;
}
