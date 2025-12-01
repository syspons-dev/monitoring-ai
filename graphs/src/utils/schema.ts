import { z } from 'zod';
import {
  StructuredDataAttribute,
  StructuredDataAttributeType,
} from '@syspons/monitoring-ai-common';

/**
 * Converts structured data attributes to a Zod schema for use with withStructuredOutput
 * @param attributes Array of structured data attributes to convert
 * @returns Zod object schema
 */
export function buildZodSchema(attributes: StructuredDataAttribute[]): z.ZodObject<any> {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  for (const attr of attributes) {
    let zodType: z.ZodTypeAny;

    // Map the attribute type to a Zod type
    switch (attr.type) {
      case StructuredDataAttributeType.string:
        zodType = z.string();
        if (attr.description) {
          zodType = zodType.describe(attr.description);
        }
        break;
      case StructuredDataAttributeType.number:
        zodType = z.number();
        if (attr.description) {
          zodType = zodType.describe(attr.description);
        }
        break;
      case StructuredDataAttributeType.boolean:
        zodType = z.boolean();
        if (attr.description) {
          zodType = zodType.describe(attr.description);
        }
        break;
      case StructuredDataAttributeType.date:
        zodType = z.string();
        if (attr.description) {
          zodType = zodType.describe(attr.description + ' (format: YYYY-MM-DD or ISO 8601)');
        } else {
          zodType = zodType.describe('Date in YYYY-MM-DD or ISO 8601 format');
        }
        break;
      case StructuredDataAttributeType.array:
        const arrayItemType = attr.itemsType || StructuredDataAttributeType.string;
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
        zodType = z.array(itemZodType);
        if (attr.description) {
          zodType = zodType.describe(attr.description);
        }
        break;
      case StructuredDataAttributeType.object:
        zodType = z.record(z.string(), z.any());
        if (attr.description) {
          zodType = zodType.describe(attr.description);
        }
        break;
      default:
        zodType = z.string();
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
