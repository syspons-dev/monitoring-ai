export interface RemoteGraphConfig {
  // URL of the remote graph endpoint
  remoteUrl: string;
  // Optional API key for authentication
  apiKey?: string;
  // Optional timeout for the remote graph request in milliseconds
  timeout?: number;
}
