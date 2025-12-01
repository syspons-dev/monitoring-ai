export interface MonitoringAiPrompt {
  id: string;
  prompt: string;
  variables?: Record<string, any>;
  modelConfig?: Record<string, any>;
  validator?: (output: string) => boolean;
}

// Default prompts

export const DEFAULT_CHAT_PROMPT: MonitoringAiPrompt = {
  id: 'default_chat_prompt',
  prompt: 'You are a helpful AI assistant.',
};

export const KNOWLEDGE_BASE_SYSTEM_PROMPT: MonitoringAiPrompt = {
  id: 'knowledge_base_system_prompt',
  prompt:
    'You are a helpful assistant with access to a knowledge base. When asked about specific information or documents, check the knowledge base first.',
};
