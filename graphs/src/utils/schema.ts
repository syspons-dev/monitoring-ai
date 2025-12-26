import { z } from 'zod';
import {
  MonitoringAiStructureDataReasoningIndicator,
  StructuredDataAttribute,
  StructuredDataAttributeType,
} from '@syspons/monitoring-ai-common';

/**
 * Maps a StructuredDataAttributeType to a Zod type
 * @param type The StructuredDataAttributeType to map
 * @param itemsType Optional array items type for array attributes
 * @returns The corresponding Zod type
 */
function mapToZodType(
  type: StructuredDataAttributeType,
  itemsType?: StructuredDataAttributeType
): z.ZodTypeAny {
  switch (type) {
    case StructuredDataAttributeType.string:
      return z.string();
    case StructuredDataAttributeType.number:
      return z.number();
    case StructuredDataAttributeType.boolean:
      return z.boolean();
    case StructuredDataAttributeType.date:
      return z.string();
    case StructuredDataAttributeType.array:
      const arrayItemType = itemsType || StructuredDataAttributeType.string;
      let itemZodType: z.ZodTypeAny;
      switch (arrayItemType) {
        case StructuredDataAttributeType.string:
          itemZodType = z.string();
          break;
        case StructuredDataAttributeType.number:
          itemZodType = z.number();
          break;
        case StructuredDataAttributeType.boolean:
          itemZodType = z.boolean();
          break;
        default:
          itemZodType = z.string();
      }
      return z.array(itemZodType);
    case StructuredDataAttributeType.object:
      return z.record(z.string(), z.any());
    default:
      return z.string();
  }
}

/**
 * Adds a new attribute to an existing Zod schema
 * @param zodSchema The existing Zod object schema
 * @param attributeName The name of the attribute to add
 * @param type The StructuredDataAttributeType for the attribute
 * @param description Optional description for the attribute
 * @param required Whether the attribute is required (default: false)
 */
export function addZodAttribute(
  zodSchema: z.ZodObject<any>,
  attributeName: string,
  type: StructuredDataAttributeType,
  description?: string,
  required: boolean = false
): void {
  let zodType = mapToZodType(type);

  // Add date format info to description
  if (type === StructuredDataAttributeType.date) {
    if (description) {
      description = description + ' (format: YYYY-MM-DD or ISO 8601)';
    } else {
      description = 'Date in YYYY-MM-DD or ISO 8601 format';
    }
  }

  if (description) {
    zodType = zodType.describe(description);
  }

  if (!required) {
    zodType = zodType.nullable();
  }

  zodSchema.shape[attributeName] = zodType;
}

/**
 * Converts structured data attributes to a Zod schema for use with withStructuredOutput
 * @param attributes Array of structured data attributes to convert
 * @returns Zod object schema
 */
export function buildZodSchema(attributes: StructuredDataAttribute[]): z.ZodObject<any> {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  for (const attr of attributes) {
    let zodType = mapToZodType(attr.type, attr.itemsType);

    // Add description with special handling for dates
    if (attr.description) {
      if (attr.type === StructuredDataAttributeType.date) {
        zodType = zodType.describe(attr.description + ' (format: YYYY-MM-DD or ISO 8601)');
      } else {
        zodType = zodType.describe(attr.description);
      }
    } else if (attr.type === StructuredDataAttributeType.date) {
      zodType = zodType.describe('Date in YYYY-MM-DD or ISO 8601 format');
    }

    // For Azure OpenAI, optional fields should be nullable instead of optional
    // This ensures they appear in the 'required' array but can have null values
    if (!attr.required) {
      zodType = zodType.nullable();
    }

    schemaShape[attr.name] = zodType;
  }

  return z.object(schemaShape);
}
