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
  name: string;
  type: StructuredDataAttributeType;
  description?: string;
  required?: boolean;
  itemsType?: StructuredDataAttributeType; // Array items type definition
}

export interface MonitoringAiDataFlowConfig {
  structuredDataAttributes: StructuredDataAttribute[];
}
