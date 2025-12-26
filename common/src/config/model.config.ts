export interface MonitoringAiModelConfig {
  // Endpoint URL of the model service
  endpoint: string;
  // API key for authenticating with the model service
  apiKey: string;
  // Model deployment or name
  deployment: string;
  // API version if applicable
  apiVersion: string;
  // Request timeout in milliseconds
  modelRequestTimeout: number;
  // Number of retries for failed requests
  modelMaxRetries: number;
  // Maximum tokens for the model response
  maxTokens: number;
  // Sampling temperature for response generation
  temperature: number;
  // Nucleus sampling parameter
  topP: number;
  // Number of past messages to include in the context
  pastMessagesIncluded: number;
  // System message to guide the model's behavior
  systemMessage: string;
}
