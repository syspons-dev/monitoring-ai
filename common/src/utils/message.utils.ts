import type { MonitoringAiMessage } from '../types/message.types.js';

/**
 * Display message for client UIs
 */
export interface MonitoringAiDisplayMessage {
  type: 'human' | 'assistant';
  content: string;
  toolsUsed?: string[];
  timestamp?: Date;
}

/**
 * Filters messages to only include those that should be displayed to users.
 * Excludes tool messages and AI messages with tool calls (intermediate thinking).
 *
 * @param messages - Array of messages to filter
 * @returns Array of messages safe to display to users
 *
 * @example
 * ```typescript
 * const result = await invokeAgent({...});
 * const displayable = getDisplayableMessages(result.messages);
 * ```
 */
export function getDisplayableMessages(messages: MonitoringAiMessage[]): MonitoringAiMessage[] {
  return messages.filter((msg) => {
    const type = msg.type;

    // Check if content is non-empty
    const hasContent =
      msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0;
    if (!hasContent) return false;

    // Show human messages
    if (type === 'human') return true;

    // Show AI messages without tool calls (final responses)
    if (type === 'ai' && !msg.additional_kwargs?.tool_calls) return true;

    // Hide everything else (tool messages, AI with tool calls)
    return false;
  });
}

/**
 * Formats messages for display in client UIs with enhanced metadata.
 * Tracks which tools were used and provides clean role-based formatting.
 *
 * @param messages - Array of messages to format
 * @returns Array of formatted display messages
 *
 * @example
 * ```typescript
 * const result = await invokeAgent({...});
 * const formatted = formatMessagesForDisplay(result.messages);
 *
 * formatted.forEach(msg => {
 *   if (msg.role === 'user') {
 *     ui.addUserMessage(msg.content);
 *   } else {
 *     ui.addAssistantMessage(msg.content);
 *     if (msg.toolsUsed?.length) {
 *       ui.addIndicator(`🔍 Used: ${msg.toolsUsed.join(', ')}`);
 *     }
 *   }
 * });
 * ```
 */
export function formatMessagesForDisplay(
  messages: MonitoringAiMessage[]
): MonitoringAiDisplayMessage[] {
  const displayMessages: MonitoringAiDisplayMessage[] = [];
  let currentToolsUsed: string[] = [];

  for (const msg of messages) {
    const type = msg.type;

    // Skip messages with empty content
    const hasContent =
      msg.content && typeof msg.content === 'string' && msg.content.trim().length > 0;
    if (!hasContent && type !== 'tool') continue;

    if (type === 'human') {
      displayMessages.push({
        type: 'human',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      });
    } else if (type === 'tool') {
      // Track tools used
      if (msg.author) {
        currentToolsUsed.push(msg.author);
      }
    } else if (type === 'ai') {
      // Only show AI messages without tool calls (final responses)
      if (!msg.additional_kwargs?.tool_calls) {
        displayMessages.push({
          type: 'assistant',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          toolsUsed: currentToolsUsed.length > 0 ? [...currentToolsUsed] : undefined,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        });

        // Reset tools tracker
        currentToolsUsed = [];
      }
    }
  }

  return displayMessages;
}
