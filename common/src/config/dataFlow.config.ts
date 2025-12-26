/**
 * Supported data types for structured data attributes that can be transformed
 * into a schema for LLM consumption
 */
export enum StructuredDataAttributeType {
  string = 'string',
  number = 'number',
  boolean = 'boolean',
  array = 'array',
  object = 'object',
  date = 'date',
}

export interface StructuredDataAttribute {
  id: string;
  name: string;
  type: StructuredDataAttributeType;
  enabled: boolean;
  description?: string;
  required?: boolean;
  itemsType?: StructuredDataAttributeType; // Array items type definition
  reasoningAttributeKey?: string; // Key to link reasoning data
}

export interface MonitoringAiDataFlowConfig {
  structuredDataAttributes: StructuredDataAttribute[];
}

export const MonitoringAiStructureDataReasoningIndicator = '__reasoning';
