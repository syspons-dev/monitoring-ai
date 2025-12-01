export interface MonitoringAiModelConfig {
  // Endpoint URL of the model service
  endpoint: string;
  // API key for authenticating with the model service
  apiKey: string;
  // Model deployment or name
  deployment: string;
  // API version if applicable
  apiVersion: string;

  // Additional optional parameters
  // Number of past messages to include in the context
  pastMessagesIncluded?: number;
  // Maximum tokens for the model response
  maxTokens?: number;
  // Sampling temperature for response generation
  temperature?: number;
  // Nucleus sampling parameter
  topP?: number;
  // System message to guide the model's behavior
  systemMessage?: string;
}
