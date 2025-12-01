import { GraphDescription } from '@syspons/monitoring-ai-common';

/**
 * Chat Graph - Basic conversational AI workflow
 *
 * This graph provides simple, direct responses to user messages using AI.
 * Perfect for straightforward Q&A, content generation, and quick interactions.
 */

export const chatGraphDescription: GraphDescription = {
  name: 'Chat Graph',
  shortDescription: 'Simple AI chat for direct question-answering and conversations',

  behavior: {
    summary: 'Processes your message through an AI model with configurable conversation history',

    howItWorks: [
      'Receives your message',
      'Includes previous messages based on API settings',
      'Sends to the AI model',
      'Returns the AI response',
    ],

    characteristics: [
      'Fast and straightforward',
      'Maintains conversation context based on API configuration',
      'Supports multi-turn conversations',
      'Direct AI responses',
    ],
  },

  suitability: {
    bestFor: [
      'Quick questions and answers',
      'Content generation (summaries, translations)',
      'Text analysis and classification',
      'Conversational chatbot interactions',
      'Follow-up questions within the same conversation',
    ],

    notSuitableFor: [
      'Complex workflows with multiple steps',
      'Tasks requiring advanced reasoning or tool use',
      'Workflows with branching logic',
    ],
  },

  nodes: [
    {
      name: 'START',
      description: 'Entry point of the graph workflow',
    },
    {
      name: 'CHAT_NODE',
      description: 'Processes user message through the AI model and returns a response',
    },
    {
      name: 'END',
      description: 'Exit point of the graph workflow',
    },
  ],

  example: {
    userMessage: 'What is the capital of France?',
    aiResponse: 'The capital of France is Paris.',
    note: 'Conversation history is maintained based on the maxPreviousMessages parameter in your API settings',
  },
};
