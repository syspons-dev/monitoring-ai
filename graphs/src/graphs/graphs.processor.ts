import {
  MonitoringAiBaseGraphStateType,
  MonitoringAiDataFlowConfig,
  MonitoringAiGraphs,
  MonitoringAiWorkflowConfig,
} from '@syspons/monitoring-ai-common';
import {
  MonitoringAiChatGraph,
  MonitoringAiExternalGraph,
  MonitoringAiBaseGraph,
} from './index.js';
import {
  EmbeddingController,
  MonitoringAiModelSettings,
  MonitoringGraphSettings,
} from '../index.js';

export interface MonitoringAiGraphsProcessorParams {
  graphConfig: MonitoringAiWorkflowConfig;
  dataflowConfig?: MonitoringAiDataFlowConfig;
  modelParams: MonitoringAiModelSettings;
  state: MonitoringAiBaseGraphStateType;
  embeddingController?: EmbeddingController;
  debug?: boolean;
}

class MonitoringAiGraphsProcessor {
  static async onGraphInit(
    params: MonitoringAiGraphsProcessorParams
  ): Promise<MonitoringAiBaseGraphStateType | void> {
    const { graphConfig, dataflowConfig, state, modelParams } = params;

    MonitoringAiGraphsProcessor.validateParams(params);

    console.log(
      `MonitoringAiGraphsProcessor. Initializing graph: ${graphConfig.monitoringAiGraph}`
    );

    if (params.graphConfig.hasProactiveMessage && state.messages.length === 0) {
      // Graph initialization for proactive message
      try {
        const result = await MonitoringAiGraphsProcessor.invokeGraph(params);
        return result;
      } catch (error) {
        throw new Error(
          `Error running graph ${graphConfig.monitoringAiGraph}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      return;
    }
  }

  static async runGraph(
    params: MonitoringAiGraphsProcessorParams
  ): Promise<MonitoringAiBaseGraphStateType> {
    const { graphConfig, dataflowConfig, state, modelParams } = params;

    MonitoringAiGraphsProcessor.validateParams(params);

    console.log(`MonitoringAiGraphsProcessor. Running graph: ${graphConfig.monitoringAiGraph} `);

    // Invoke the graph
    try {
      const result = await MonitoringAiGraphsProcessor.invokeGraph(params);
      return result;
    } catch (error) {
      throw new Error(
        `Error running graph ${graphConfig.monitoringAiGraph}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private static validateParams(params: MonitoringAiGraphsProcessorParams): void {
    const { graphConfig, modelParams } = params;

    if (!graphConfig.monitoringAiGraph) {
      throw new Error('Graph not specified');
    }
    if (!modelParams || !modelParams.MODEL_API_KEY || !modelParams.MODEL_BASE_URL) {
      throw new Error('Model parameters are invalid or missing');
    }
  }

  private static async invokeGraph(
    params: MonitoringAiGraphsProcessorParams
  ): Promise<MonitoringAiBaseGraphStateType> {
    const { graphConfig, state, modelParams, dataflowConfig } = params;

    // Initialize settings
    const settings: MonitoringGraphSettings = new MonitoringGraphSettings({
      modelSettings: modelParams,
    });

    // Initialize the appropriate graph
    let baseGraph: MonitoringAiBaseGraph<any> | undefined;
    switch (graphConfig.monitoringAiGraph) {
      case MonitoringAiGraphs.chat_graph:
        baseGraph = new MonitoringAiChatGraph(settings);
        break;

      case MonitoringAiGraphs.external_graph:
        // Graph is deployed externally - requires externalUrl in config
        if (!graphConfig.externalUrl) {
          throw new Error('Custom graph requires externalUrl in configuration');
        }
        baseGraph = new MonitoringAiExternalGraph(settings, {
          externalUrl: graphConfig.externalUrl,
          apiKey: graphConfig.externalApiKey,
          timeout: graphConfig.externalTimeout,
        });
        break;

      default:
        throw new Error(`Graph ${graphConfig.monitoringAiGraph} not implemented`);
    }

    if (!baseGraph) {
      throw new Error(`Failed to initialize graph ${graphConfig.monitoringAiGraph}`);
    }

    if (params.embeddingController) {
      baseGraph.embeddingController = params.embeddingController;
    }

    return await baseGraph.invokeGraph({
      state,
      dataflowConfig,
      debug: params.debug,
    });
  }
}

export { MonitoringAiGraphsProcessor };
