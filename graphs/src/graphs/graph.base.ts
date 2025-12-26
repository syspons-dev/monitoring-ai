import { CompiledStateGraph } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

import {
  MonitoringAiBaseGraphStateType,
  MonitoringAiDataFlowConfig,
  MonitoringAiNodeUsageEntry,
} from '@syspons/monitoring-ai-common';

import { MonitoringAiBaseGraphState } from '../types/index.js';
import { MonitoringGraphSettings } from '../utils/index.js';
import { EmbeddingController } from '../controllers/index.js';
import {
  convertToLangChainMessages,
  convertFromLangChainMessages,
} from '../utils/message-converter.js';
import { TokensController } from '../controllers/tokensController/tokensController.js';

export interface MonitoringAiBaseGraphInvokeParams {
  state: MonitoringAiBaseGraphStateType;
  dataflowConfig?: MonitoringAiDataFlowConfig;
  debug?: boolean;
}

export abstract class MonitoringAiBaseGraph<T extends MonitoringAiBaseGraphState> {
  abstract graph: CompiledStateGraph<T, Partial<T>>;
  settings: MonitoringGraphSettings;
  model: ChatOpenAI;

  // Optional Data Flow Config. Will be set on every invoke if provided
  dataFlowConfig?: MonitoringAiDataFlowConfig;

  embeddingController: EmbeddingController;
  tokensController: TokensController;

  // Enable debug console logs (default: false)
  debug: boolean = false;

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
    this.tokensController = new TokensController(this.settings.MODEL_NAME);
  }

  async invokeGraph(
    params: MonitoringAiBaseGraphInvokeParams
  ): Promise<MonitoringAiBaseGraphStateType> {
    try {
      this.dataFlowConfig = params.dataflowConfig;

      // Update debug flag if provided
      if (params.debug !== undefined) {
        this.debug = params.debug;
      }

      // Convert MonitoringAiMessage[] to LangChain BaseMessage[]
      const langchainMessages = convertToLangChainMessages(params.state.messages);

      // Invoke graph with converted messages
      const result = await this.graph.invoke({
        ...params.state,
        messages: langchainMessages,
      } as unknown as T);

      // Collect usage entries from both controllers
      const graphUsageEntries = this.tokensController.getUsageEntries();
      const embeddingUsageEntries = this.embeddingController.getUsageEntries();

      // Merge with existing usagePerNode from graph result
      const resultUsagePerNode =
        'usagePerNode' in result
          ? (result.usagePerNode as MonitoringAiNodeUsageEntry[] | undefined)
          : undefined;
      const allUsageEntries = [
        ...(resultUsagePerNode || []),
        ...graphUsageEntries,
        ...embeddingUsageEntries,
      ];

      // Clear controllers for next invocation
      this.tokensController.clearUsageEntries();
      this.embeddingController.clearUsageEntries();

      // Convert result back to MonitoringAiMessage[]
      const resultMessages = (result as any).messages;
      return {
        ...result,
        messages: convertFromLangChainMessages(resultMessages),
        usagePerNode: allUsageEntries,
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
