# External Graph Service

The External Graph service provides a way to integrate externally deployed LangGraph graphs via REST API. This allows you to use graphs that are deployed separately from your main application.

## Overview

`MonitoringAiExternalGraph` acts as a proxy that forwards graph invocations to an external service via HTTP POST requests. It maintains the same interface as other graph implementations for consistency.

## Features

- **External Graph Integration**: Connect to graphs deployed on separate servers
- **Configurable Authentication**: Optional API key support via Bearer token
- **Timeout Control**: Configurable request timeout with abort handling
- **Error Handling**: Comprehensive error messages for debugging
- **Type Safety**: Full TypeScript support with proper types

## Configuration

To use a custom graph, configure it in your `MonitoringAiWorkflowConfig`:

```typescript
const config: MonitoringAiWorkflowConfig = {
  monitoringAiGraph: MonitoringAiGraphs.external_graph,
  
  // Required: URL of the external graph service
  externalUrl: 'https://your-graph-service.com/api/graph/invoke',
  
  // Optional: API key for authentication
  externalApiKey: 'your-api-key-here',
  
  // Optional: Request timeout in milliseconds (default: 30000)
  externalTimeout: 60000,
};
```

## External API Contract

Your external graph service should implement the following REST API:

### Endpoint
`POST <externalUrl>`

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <apiKey>  (if apiKey is provided)
```

### Request Body
```typescript
{
  "state": {
    "messages": [...],  // Array of messages
    // ... other state properties
  },
  "modelSettings": {
    "modelName": "gpt-4",
    "maxTokens": "4096"
  }
}
```

### Response
The service should return a JSON object representing the updated state:

```typescript
{
  "messages": [...],  // Updated messages array
  // ... other updated state properties
}
```

### Response Codes
- `200`: Success - returns updated state
- `4xx`: Client error (invalid request, authentication failure, etc.)
- `5xx`: Server error (graph execution failure, etc.)

## Usage Example

```typescript
import { MonitoringAiGraphsProcessor } from './graphs/graphs.processor';
import { MonitoringAiGraphs } from '@syspons/monitoring-ai-common';

// Configure the processor with external graph settings
const result = await MonitoringAiGraphsProcessor.runGraph({
  graphConfig: {
    monitoringAiGraph: MonitoringAiGraphs.external_graph,
    externalUrl: 'https://api.example.com/graph',
    externalApiKey: process.env.GRAPH_API_KEY,
    externalTimeout: 45000,
  },
  modelParams: {
    MODEL_NAME: 'gpt-4',
    MODEL_BASE_URL: 'https://api.openai.com/v1',
    MODEL_API_KEY: process.env.OPENAI_API_KEY,
  },
  state: {
    messages: [
      { role: 'user', content: 'Hello!' }
    ],
  },
});

console.log('Graph result:', result);
```

## Error Handling

The custom graph service provides detailed error messages:

- **Missing URL**: Throws if `externalUrl` is not provided in config
- **Timeout**: Throws if request exceeds configured timeout
- **HTTP Errors**: Throws with status code and message for failed requests
- **Invalid Response**: Throws if response is not a valid JSON object
- **Network Errors**: Throws with underlying error message

Example error handling:

```typescript
try {
  const result = await processor.runGraph(params);
} catch (error) {
  if (error.message.includes('timed out')) {
    // Handle timeout
  } else if (error.message.includes('failed:')) {
    // Handle HTTP error
  } else {
    // Handle other errors
  }
}
```

## Implementation Details

### Constructor
```typescript
new MonitoringAiExternalGraph(settings, config)
```

**Parameters:**
- `settings`: `MonitoringGraphSettings` - Graph configuration
- `config`: `ExternalGraphConfig` - External graph configuration
  - `externalUrl`: string - URL of the external graph service
  - `apiKey?`: string - Optional API key for authentication
  - `timeout?`: number - Optional timeout in ms (default: 30000)

### Methods

#### `invokeGraph(state)`
Invokes the external graph with the provided state.

**Parameters:**
- `state`: `MonitoringAiBaseGraphState` - Current graph state

**Returns:**
- `Promise<Partial<MonitoringAiBaseGraphState>>` - Updated state from external service

**Throws:**
- Error if request fails, times out, or returns invalid response

## Best Practices

1. **Always set a reasonable timeout**: Default is 30s, but adjust based on your graph's complexity
2. **Use environment variables**: Store API keys and URLs in environment variables
3. **Implement retry logic**: Consider implementing retry logic for transient failures
4. **Monitor performance**: Track request times and success rates
5. **Validate responses**: Ensure your external service returns properly formatted responses
6. **Handle errors gracefully**: Implement proper error handling and user feedback

## Security Considerations

- **API Key Protection**: Never commit API keys to source control
- **HTTPS Only**: Always use HTTPS URLs for production deployments
- **Input Validation**: External service should validate all inputs
- **Rate Limiting**: Consider implementing rate limiting on both sides
- **Authentication**: Use strong API keys and rotate them regularly

## Testing

Example test setup:

```typescript
import { MonitoringAiExternalGraph } from './externalGraph';

// Mock fetch for testing
global.fetch = vi.fn();

test('should invoke external graph successfully', async () => {
  const mockResponse = {
    messages: [{ role: 'assistant', content: 'Response' }]
  };
  
  (fetch as any).mockResolvedValueOnce({
    ok: true,
    json: async () => mockResponse,
  });

  const graph = new MonitoringAiExternalGraph(settings, {
    externalUrl: 'https://test.com/graph',
  });

  const result = await graph.invokeGraph({ messages: [] });
  expect(result).toEqual(mockResponse);
});
```

## Troubleshooting

### Connection Refused
- Verify the external URL is correct and accessible
- Check network connectivity and firewall rules

### Authentication Errors
- Verify API key is correct
- Check if the Authorization header format is supported

### Timeout Errors
- Increase timeout value if graph processing is slow
- Check external service performance

### Invalid Response
- Verify external service returns valid JSON
- Check response structure matches expected format
