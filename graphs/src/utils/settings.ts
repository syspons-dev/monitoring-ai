export interface MonitoringAiModelSettings {
  MODEL_NAME: string;
  MODEL_BASE_URL: string;
  MODEL_API_KEY: string;
  MODEL_API_VERSION: string;
  MODEL_MAX_TOKENS?: string;
  MODEL_REQUEST_TIMEOUT?: string;
  MODEL_MAX_RETRIES?: string;
  MODEL_CONNECT_TIMEOUT?: string;
}

export interface MonitoringAiSettingsConfig {
  modelSettings: MonitoringAiModelSettings;
}

const DEFAULT_SETTINGS = {
  MODEL_MAX_TOKENS: '4096',
  MODEL_REQUEST_TIMEOUT: '30000',
  MODEL_MAX_RETRIES: '3',
  MODEL_CONNECT_TIMEOUT: '10000',
} as const;

export class MonitoringGraphSettings {
  readonly MODEL_NAME: string;
  readonly MODEL_BASE_URL: string;
  readonly MODEL_API_KEY: string;
  readonly MODEL_API_VERSION: string;
  readonly MODEL_MAX_TOKENS: string;
  readonly MODEL_REQUEST_TIMEOUT: string;
  readonly MODEL_MAX_RETRIES: string;
  readonly MODEL_CONNECT_TIMEOUT: string;

  constructor(config: MonitoringAiSettingsConfig) {
    // Set Model Settings
    this.MODEL_NAME = config.modelSettings.MODEL_NAME;
    this.MODEL_BASE_URL = config.modelSettings.MODEL_BASE_URL;
    this.MODEL_API_KEY = config.modelSettings.MODEL_API_KEY;
    this.MODEL_API_VERSION = config.modelSettings.MODEL_API_VERSION;
    this.MODEL_MAX_TOKENS =
      config.modelSettings.MODEL_MAX_TOKENS ?? DEFAULT_SETTINGS.MODEL_MAX_TOKENS;
    this.MODEL_REQUEST_TIMEOUT =
      config.modelSettings.MODEL_REQUEST_TIMEOUT ?? DEFAULT_SETTINGS.MODEL_REQUEST_TIMEOUT;
    this.MODEL_MAX_RETRIES =
      config.modelSettings.MODEL_MAX_RETRIES ?? DEFAULT_SETTINGS.MODEL_MAX_RETRIES;
    this.MODEL_CONNECT_TIMEOUT =
      config.modelSettings.MODEL_CONNECT_TIMEOUT ?? DEFAULT_SETTINGS.MODEL_CONNECT_TIMEOUT;
  }
}
