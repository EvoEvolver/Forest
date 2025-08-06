export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'objectId' | 'unknown';

/**
 * Detect the type of a field value
 */
export function detectFieldType(value: any): FieldType {
  if (value === null || value === undefined) {
    return 'unknown';
  }
  
  // Check for ObjectId (MongoDB ObjectId pattern)
  if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
    return 'objectId';
  }
  
  // Check for Date
  if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
    return 'date';
  }
  
  // Check for Boolean
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  
  // Check for Number
  if (typeof value === 'number' && !isNaN(value)) {
    return 'number';
  }
  
  // Check for String
  if (typeof value === 'string') {
    return 'string';
  }
  
  // Everything else (objects, arrays, etc.)
  return 'unknown';
}

/**
 * Convert form input value to appropriate type
 */
export function convertFieldValue(value: string, type: FieldType): any {
  if (!value && value !== '0' && value !== 'false') {
    return null;
  }
  
  switch (type) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
      
    case 'boolean':
      return value === 'true' || value === '1' || value === 'yes';
      
    case 'date':
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
      
    case 'objectId':
      // ObjectIds should not be editable in this phase
      return value;
      
    case 'string':
    default:
      return value;
  }
}

/**
 * Convert value to string for form input display
 */
export function valueToString(value: any, type: FieldType): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  switch (type) {
    case 'boolean':
      return value ? 'true' : 'false';
      
    case 'date':
      if (value instanceof Date) {
        return value.toISOString().split('T')[0]; // YYYY-MM-DD format
      }
      return new Date(value).toISOString().split('T')[0];
      
    case 'number':
      return String(value);
      
    case 'objectId':
    case 'string':
    default:
      return String(value);
  }
}

/**
 * Check if field type is editable
 */
export function isFieldEditable(fieldName: string, type: FieldType): boolean {
  // _id is not editable
  if (fieldName === '_id') {
    return false;
  }
  
  // ObjectIds are not editable in this phase
  if (type === 'objectId') {
    return false;
  }
  
  // Unknown types are not editable for safety
  if (type === 'unknown') {
    return false;
  }
  
  return true;
}

/**
 * Get field type from schema, fallback to first non-null value
 */
export function getFieldTypeFromSchema(
  fieldName: string,
  documents: any[],
  schema?: Record<string, string>
): FieldType {
  // First try to get type from schema
  if (schema && schema[fieldName]) {
    const schemaType = schema[fieldName];
    // Convert schema type to our FieldType
    switch (schemaType) {
      case 'string': return 'string';
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'date': return 'date';
      case 'objectId': return 'objectId';
      default: return 'string'; // Default to string for unknown schema types
    }
  }
  
  // Fallback to detecting from first non-null value
  const sampleValue = documents.find(doc => doc[fieldName] != null)?.[fieldName];
  const detectedType = detectFieldType(sampleValue);
  
  // If still unknown (all values are null), default to string
  return detectedType === 'unknown' ? 'string' : detectedType;
}