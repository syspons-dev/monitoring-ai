import { GraphDescription } from '@syspons/monitoring-ai-common';

/**
 * Remote Graph - Proxy to remotely deployed graph services
 *
 * This graph acts as a proxy to graph workflows deployed on remote services.
 * It forwards requests to a remote endpoint and returns the processed response.
 */

export const remoteGraphDescription: GraphDescription = {
  name: 'Remote Graph',
  shortDescription: 'Proxy to remotely deployed graph services via REST API',

  behavior: {
    summary:
      'Forwards your request to a remote graph service endpoint and returns the processed result',

    howItWorks: [
      'Receives your message and configuration',
      'Sends HTTP request to the remote graph endpoint',
      'Processes the response from the remote service',
      'Returns the result to the caller',
    ],

    characteristics: [
      'Delegates processing to remote services',
      'Supports custom authentication and timeouts',
      'Stateless proxy behavior',
      'Flexible integration with any REST-based graph service',
    ],
  },

  suitability: {
    bestFor: [
      'Connecting to separately deployed LangGraph services',
      'Integrating third-party AI workflow APIs',
      'Distributed architectures with remote graph processing',
      'Environments requiring service isolation',
    ],

    notSuitableFor: [
      'Local-only processing without network access',
      'High-frequency requests requiring minimal latency',
      'Scenarios where remote dependencies are unacceptable',
    ],
  },

  nodes: [
    {
      name: 'START',
      description: 'Entry point of the graph workflow',
    },
    {
      name: 'PROXY_NODE',
      description: 'Forwards request to remote graph service endpoint and processes response',
    },
    {
      name: 'END',
      description: 'Exit point of the graph workflow',
    },
  ],

  example: {
    userMessage: 'Process this through the remote sentiment analysis workflow',
    aiResponse: 'Request forwarded to remote service at https://api.example.com/graphs/sentiment',
    note: 'Requires externalUrl configuration pointing to a deployed graph service endpoint',
  },
};
