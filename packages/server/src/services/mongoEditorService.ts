import { Db, Collection, ObjectId } from 'mongodb';
import { getMongoClient } from '../mongoConnection';

export interface MongoDocument {
  _id: ObjectId | string;
  [key: string]: any;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Use Forest's database name from environment
const DATABASE_NAME = process.env.DATABASE_NAME || 'test_db';

export class MongoEditorService {
  private static instance: MongoEditorService;

  private constructor() {}

  public static getInstance(): MongoEditorService {
    if (!MongoEditorService.instance) {
      MongoEditorService.instance = new MongoEditorService();
    }
    return MongoEditorService.instance;
  }

  private getDB(): Db {
    const client = getMongoClient();
    if (!client) {
      throw new Error('MongoDB client not initialized. Call setMongoConnection() first.');
    }
    return client.db(DATABASE_NAME);
  }

  async listCollections(): Promise<ApiResponse<string[]>> {
    try {
      const collections = await this.getDB().listCollections().toArray();
      const collectionNames = collections.map(col => col.name);
      return { success: true, data: collectionNames };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to list collections' 
      };
    }
  }

  async getDocuments(
    collectionName: string, 
    page = 1, 
    limit = 25
  ): Promise<ApiResponse<PaginatedResult<MongoDocument>>> {
    try {
      const collection = this.getDB().collection(collectionName);
      const skip = (page - 1) * limit;
      
      const [documents, total] = await Promise.all([
        collection.find({}).skip(skip).limit(limit).toArray(),
        collection.countDocuments({})
      ]);

      return {
        success: true,
        data: {
          data: documents,
          total,
          page,
          limit,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get documents' 
      };
    }
  }

  async getCollectionStats(collectionName: string): Promise<ApiResponse<{
    estimatedCount: number;
    exactCount?: number;
    avgDocumentSize?: number;
    totalSize?: number;
    indexSizes?: Record<string, number>;
  }>> {
    try {
      const collection = this.getDB().collection(collectionName);
      
      // Get collection statistics using MongoDB's stats command
      const stats = await this.getDB().command({ collStats: collectionName });
      
      // Get estimated document count (fast operation)
      const estimatedCount = await collection.estimatedDocumentCount();
      
      return {
        success: true,
        data: {
          estimatedCount,
          exactCount: stats.count, // From collStats
          avgDocumentSize: stats.avgObjSize,
          totalSize: stats.size,
          indexSizes: stats.indexSizes
        }
      };
    } catch (error) {
      // If collStats fails, fall back to basic estimation
      try {
        const collection = this.getDB().collection(collectionName);
        const estimatedCount = await collection.estimatedDocumentCount();
        
        return {
          success: true,
          data: {
            estimatedCount
          }
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get collection stats'
        };
      }
    }
  }

  async getCollectionSchema(collectionName: string): Promise<ApiResponse<{
    jsonSchema?: any;
    validator?: any;
    inferredSchema?: Record<string, string>;
  }>> {
    try {
      const db = this.getDB();
      
      // First try to get the actual MongoDB schema/validator
      const collections = await db.listCollections({ name: collectionName }).toArray();
      const collection = collections[0];
      
      let jsonSchema = null;
      let validator = null;
      
      if (collection && 'options' in collection && collection.options) {
        validator = collection.options.validator;
        if (validator && validator.$jsonSchema) {
          jsonSchema = validator.$jsonSchema;
        }
      }
      
      // If no schema exists, infer schema from sample documents
      let inferredSchema: Record<string, string> = {};
      if (!jsonSchema) {
        const sampleDocs = await db.collection(collectionName)
          .find({})
          .limit(100) // Sample first 100 documents
          .toArray();
        
        if (sampleDocs.length > 0) {
          const fieldTypes: Record<string, Set<string>> = {};
          
          // Analyze field types across sample documents
          sampleDocs.forEach(doc => {
            Object.entries(doc).forEach(([field, value]) => {
              if (!fieldTypes[field]) {
                fieldTypes[field] = new Set();
              }
              fieldTypes[field].add(this.inferFieldType(value));
            });
          });
          
          // Determine most common type for each field
          Object.entries(fieldTypes).forEach(([field, types]) => {
            const typeArray = Array.from(types).filter(t => t !== 'null');
            if (typeArray.length === 1) {
              inferredSchema[field] = typeArray[0];
            } else if (typeArray.length > 1) {
              // If multiple types, prefer in order: string, number, boolean, date, objectId
              const priority = ['string', 'number', 'boolean', 'date', 'objectId'];
              const priorityType = priority.find(p => typeArray.includes(p));
              inferredSchema[field] = priorityType || typeArray[0];
            } else {
              // All values are null, default to string
              inferredSchema[field] = 'string';
            }
          });
        }
      }
      
      return {
        success: true,
        data: {
          jsonSchema,
          validator,
          inferredSchema
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get collection schema'
      };
    }
  }

  private inferFieldType(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    
    // Check for ObjectId (MongoDB ObjectId - has _id property and toString() returns 24-char hex)
    if (typeof value === 'object' && value !== null && 
        typeof value.toString === 'function' && 
        /^[0-9a-fA-F]{24}$/.test(value.toString())) {
      return 'objectId';
    }
    
    // Check for ObjectId string pattern
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
    
    // Arrays and objects
    if (Array.isArray(value)) {
      return 'array';
    }
    
    if (typeof value === 'object') {
      return 'object';
    }
    
    return 'unknown';
  }

  async updateDocument(
    collectionName: string, 
    documentId: string, 
    updateData: any
  ): Promise<ApiResponse<MongoDocument>> {
    try {
      const collection = this.getDB().collection(collectionName);
      
      // Remove _id from updates to avoid conflict
      const { _id, ...updates } = updateData;
      
      // Validate document ID
      if (!ObjectId.isValid(documentId)) {
        return { success: false, error: 'Invalid document ID' };
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(documentId) },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'Document not found' };
      }

      // Get the updated document
      const updatedDoc = await collection.findOne({ _id: new ObjectId(documentId) });
      
      if (!updatedDoc) {
        return { success: false, error: 'Failed to retrieve updated document' };
      }

      return { success: true, data: updatedDoc };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update document' 
      };
    }
  }

  async createDocument(
    collectionName: string, 
    documentData: any
  ): Promise<ApiResponse<MongoDocument>> {
    try {
      const collection = this.getDB().collection(collectionName);
      
      // Remove any existing _id from the data to let MongoDB generate it
      const { _id, ...dataWithoutId } = documentData;
      
      const result = await collection.insertOne(dataWithoutId);
      
      if (!result.insertedId) {
        return { success: false, error: 'Failed to create document' };
      }

      // Get the created document
      const createdDoc = await collection.findOne({ _id: result.insertedId });
      
      if (!createdDoc) {
        return { success: false, error: 'Failed to retrieve created document' };
      }

      return { success: true, data: createdDoc };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create document' 
      };
    }
  }

  async deleteDocument(
    collectionName: string, 
    documentId: string
  ): Promise<ApiResponse<void>> {
    try {
      const collection = this.getDB().collection(collectionName);
      
      // Validate document ID
      if (!ObjectId.isValid(documentId)) {
        return { success: false, error: 'Invalid document ID' };
      }

      const result = await collection.deleteOne({ _id: new ObjectId(documentId) });
      
      if (result.deletedCount === 0) {
        return { success: false, error: 'Document not found' };
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete document' 
      };
    }
  }

  async addField(
    collectionName: string,
    fieldName: string,
    fieldType: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array',
    defaultValue: any
  ): Promise<ApiResponse<{ modifiedCount: number }>> {
    try {
      const collection = this.getDB().collection(collectionName);
      
      // Validate field name
      if (!fieldName || fieldName.trim() === '') {
        return { success: false, error: 'Field name cannot be empty' };
      }
      
      // Get current schema state
      const schemaResponse = await this.getCollectionSchema(collectionName);
      let hasJsonSchema = false;
      let currentSchema: Record<string, string> = {};
      
      if (schemaResponse.success && schemaResponse.data) {
        if (schemaResponse.data.jsonSchema) {
          // Collection has formal JSON Schema
          hasJsonSchema = true;
          currentSchema = this.extractFieldsFromJsonSchema(schemaResponse.data.jsonSchema);
        } else if (schemaResponse.data.inferredSchema) {
          // Collection only has inferred schema
          hasJsonSchema = false;
          currentSchema = schemaResponse.data.inferredSchema;
        }
        
        // Check if field already exists in either schema type
        if (fieldName in currentSchema) {
          return { success: false, error: 'Field already exists' };
        }
      } else {
        // Fallback: get one sample document
        const sampleDoc = await collection.findOne({});
        if (sampleDoc && fieldName in sampleDoc) {
          return { success: false, error: 'Field already exists' };
        }
      }
      
      // Convert defaultValue based on fieldType
      let convertedDefaultValue = defaultValue;
      if (defaultValue !== undefined && defaultValue !== null && defaultValue !== '') {
        convertedDefaultValue = this.convertValueByType(defaultValue, fieldType);
      } else {
        // If no default value provided, use null (MongoDB null type)
        convertedDefaultValue = null;
      }
      
      // Add field to all documents that don't have it
      const result = await collection.updateMany(
        { [fieldName]: { $exists: false } },
        { $set: { [fieldName]: convertedDefaultValue } }
      );

      // Update or create JSON Schema
      try {
        if (hasJsonSchema) {
          // Update existing JSON Schema by adding the new field
          const updatedSchema = { ...currentSchema, [fieldName]: fieldType };
          const jsonSchema = this.convertInferredSchemaToJsonSchema(updatedSchema);
          await this.applyJsonSchemaToCollection(collectionName, jsonSchema);
        } else if (Object.keys(currentSchema).length > 0) {
          // Create new JSON Schema from inferred schema + new field
          const newSchema = { ...currentSchema, [fieldName]: fieldType };
          const jsonSchema = this.convertInferredSchemaToJsonSchema(newSchema);
          const schemaApplied = await this.applyJsonSchemaToCollection(collectionName, jsonSchema);
          
          if (schemaApplied) {
            console.log(`Created JSON Schema for collection ${DATABASE_NAME}.${collectionName}`);
          }
        } else {
          // Empty collection - create minimal schema with just _id and new field
          const minimalSchema = { _id: 'objectId', [fieldName]: fieldType };
          const jsonSchema = this.convertInferredSchemaToJsonSchema(minimalSchema);
          await this.applyJsonSchemaToCollection(collectionName, jsonSchema);
        }
      } catch (error) {
        // Schema update failed, but document update succeeded
        console.warn(`Document update succeeded but schema update failed for ${DATABASE_NAME}.${collectionName}:`, error);
        // Don't return error - the main operation (adding field to documents) succeeded
      }

      return { 
        success: true, 
        data: { modifiedCount: result.modifiedCount }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add field' 
      };
    }
  }

  async renameField(
    collectionName: string,
    oldFieldName: string,
    newFieldName: string
  ): Promise<ApiResponse<{ modifiedCount: number }>> {
    try {
      const collection = this.getDB().collection(collectionName);
      
      // Validate field names
      if (!oldFieldName || !newFieldName || oldFieldName.trim() === '' || newFieldName.trim() === '') {
        return { success: false, error: 'Field names cannot be empty' };
      }
      
      if (oldFieldName === newFieldName) {
        return { success: false, error: 'New field name must be different from current name' };
      }
      
      // Check if old field exists
      const docWithOldField = await collection.findOne({ [oldFieldName]: { $exists: true } });
      if (!docWithOldField) {
        return { success: false, error: 'Field to rename does not exist' };
      }
      
      // Check if new field name already exists
      const docWithNewField = await collection.findOne({ [newFieldName]: { $exists: true } });
      if (docWithNewField) {
        return { success: false, error: 'A field with the new name already exists' };
      }
      
      // Rename field in all documents
      const result = await collection.updateMany(
        { [oldFieldName]: { $exists: true } },
        { $rename: { [oldFieldName]: newFieldName } }
      );

      // Update JSON Schema if it exists
      try {
        const schemaResponse = await this.getCollectionSchema(collectionName);
        if (schemaResponse.success && schemaResponse.data && schemaResponse.data.jsonSchema) {
          const currentSchema = this.extractFieldsFromJsonSchema(schemaResponse.data.jsonSchema);
          
          if (oldFieldName in currentSchema) {
            // Update schema: remove old field, add new field with same type
            const fieldType = currentSchema[oldFieldName];
            const updatedSchema = { ...currentSchema };
            delete updatedSchema[oldFieldName];
            updatedSchema[newFieldName] = fieldType;
            
            const jsonSchema = this.convertInferredSchemaToJsonSchema(updatedSchema);
            await this.applyJsonSchemaToCollection(collectionName, jsonSchema);
          }
        }
      } catch (error) {
        // Schema update failed, but document update succeeded
        console.warn(`Field rename succeeded but schema update failed for ${DATABASE_NAME}.${collectionName}:`, error);
        // Don't return error - the main operation succeeded
      }

      return { 
        success: true, 
        data: { modifiedCount: result.modifiedCount }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to rename field' 
      };
    }
  }

  async removeField(
    collectionName: string,
    fieldName: string
  ): Promise<ApiResponse<{ modifiedCount: number }>> {
    try {
      const collection = this.getDB().collection(collectionName);
      
      // Remove the field from all documents that have it
      const result = await collection.updateMany(
        { [fieldName]: { $exists: true } },
        { $unset: { [fieldName]: "" } }
      );

      return { 
        success: true, 
        data: { modifiedCount: result.modifiedCount }
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove field' 
      };
    }
  }

  private convertValueByType(value: any, fieldType: string): any {
    switch (fieldType) {
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      case 'boolean':
        return Boolean(value);
      case 'date':
        return new Date(value);
      case 'string':
      default:
        return String(value);
    }
  }

  private mapFieldTypeToJsonSchema(fieldType: string): object {
    switch (fieldType) {
      case 'string':
        return { bsonType: "string" };
      case 'number':
        return { bsonType: ["int", "long", "double"] };
      case 'boolean':
        return { bsonType: "bool" };
      case 'date':
        return { bsonType: "date" };
      case 'objectId':
        return { bsonType: "objectId" };
      case 'array':
        return { bsonType: "array" };
      case 'object':
        return { bsonType: "object" };
      default:
        return { bsonType: ["string", "null"] }; // Flexible fallback
    }
  }

  private convertInferredSchemaToJsonSchema(inferredSchema: Record<string, string>): object {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    Object.entries(inferredSchema).forEach(([field, type]) => {
      properties[field] = this.mapFieldTypeToJsonSchema(type);
      if (field === '_id') required.push(field); // _id always required
    });
    
    return {
      $jsonSchema: {
        bsonType: "object",
        properties,
        required,
        additionalProperties: true // Always allow extra fields
      }
    };
  }

  private async applyJsonSchemaToCollection(
    collectionName: string,
    jsonSchema: object
  ): Promise<boolean> {
    try {
      const db = this.getDB();
      await db.command({
        collMod: collectionName,
        validator: jsonSchema,
        validationLevel: "moderate", // Only validate inserts and updates to conforming docs
        validationAction: "warn" // Log validation errors but don't prevent operations
      });
      return true;
    } catch (error) {
      console.warn(`Failed to apply JSON Schema to ${DATABASE_NAME}.${collectionName}:`, error);
      return false; // Non-blocking failure
    }
  }

  private extractFieldsFromJsonSchema(jsonSchema: any): Record<string, string> {
    const fields: Record<string, string> = {};
    
    // Handle both wrapped ($jsonSchema) and unwrapped formats
    let schemaProperties;
    if (jsonSchema && jsonSchema.$jsonSchema && jsonSchema.$jsonSchema.properties) {
      schemaProperties = jsonSchema.$jsonSchema.properties;
    } else if (jsonSchema && jsonSchema.properties) {
      schemaProperties = jsonSchema.properties;
    }
    
    if (schemaProperties) {
      Object.entries(schemaProperties).forEach(([field, definition]: [string, any]) => {
        // Convert back from JSON Schema to our field types
        if (definition.bsonType) {
          const bsonType = Array.isArray(definition.bsonType) ? definition.bsonType[0] : definition.bsonType;
          switch (bsonType) {
            case 'string':
              fields[field] = 'string';
              break;
            case 'int':
            case 'long':
            case 'double':
              fields[field] = 'number';
              break;
            case 'bool':
              fields[field] = 'boolean';
              break;
            case 'date':
              fields[field] = 'date';
              break;
            case 'objectId':
              fields[field] = 'objectId';
              break;
            case 'array':
              fields[field] = 'array';
              break;
            case 'object':
              fields[field] = 'object';
              break;
            default:
              fields[field] = 'unknown';
          }
        }
      });
    }
    
    return fields;
  }

  async testConnection(): Promise<ApiResponse<{ status: string; database: string }>> {
    try {
      // Try to get database stats to test connection
      const admin = this.getDB().admin();
      await admin.ping();
      
      return { 
        success: true, 
        data: { 
          status: 'connected', 
          database: DATABASE_NAME 
        } 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }
}