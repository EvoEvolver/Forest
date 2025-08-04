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

// New interfaces for refactored schema operations
interface SchemaState {
  hasJsonSchema: boolean;
  hasInferredSchema: boolean;
  currentSchema: Record<string, string>;
  isEmpty: boolean;
}

interface ValidationResult {
  success: boolean;
  error?: string;
}

interface FieldOperationParams {
  operation: 'add' | 'remove' | 'rename';
  fieldName?: string;
  oldFieldName?: string;
  newFieldName?: string;
  fieldType?: string;
}

interface OperationResults {
  documentResult?: { modifiedCount: number };
  schemaResult?: { success: boolean; error?: string };
  operation: string;
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
    inferredSchema?: Record<string, string>;
  }>> {
    try {
      const db = this.getDB();
      
      // First try to get the actual MongoDB schema/validator
      const collections = await db.listCollections({ name: collectionName }).toArray();
      const collection = collections[0];
      
      let jsonSchema = null;
      
      if (collection && 'options' in collection && collection.options) {
        const validator = collection.options.validator;
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
    
    // Check for Boolean first (most specific)
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    
    // Check for Number
    if (typeof value === 'number' && !isNaN(value)) {
      return 'number';
    }
    
    // Check for Date (instanceof only - no string parsing)
    if (value instanceof Date) {
      return 'date';
    }
    
    // Check for ObjectId (simplified - only MongoDB ObjectId objects)
    if (typeof value === 'object' && value.constructor && value.constructor.name === 'ObjectId') {
      return 'objectId';
    }
    
    // Arrays and objects
    if (Array.isArray(value)) {
      return 'array';
    }
    
    if (typeof value === 'object') {
      return 'object';
    }
    
    // Default to string for all other cases (including string values)
    return 'string';
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
      // 1. Validation
      const validation = await this.validateDocumentOperation(collectionName, 'create', { documentData });
      if (!validation.success) {
        return { success: false, error: validation.error };
      }
      
      // 2. Type conversion based on schema
      const conversionResult = await this.validateAndConvertDocumentData(collectionName, documentData);
      if (!conversionResult.success) {
        return { success: false, error: conversionResult.error };
      }
      
      // 3. Execute document creation
      const collection = this.getDB().collection(collectionName);
      const result = await collection.insertOne(conversionResult.data);
      
      if (!result.insertedId) {
        return this.handleDocumentOperationResult('createDocument', null, 'Failed to create document');
      }

      // 4. Get the created document
      const createdDoc = await collection.findOne({ _id: result.insertedId });
      
      if (!createdDoc) {
        return this.handleDocumentOperationResult('createDocument', null, 'Failed to retrieve created document');
      }

      return this.handleDocumentOperationResult('createDocument', createdDoc);
    } catch (error) {
      return this.handleDocumentOperationResult(
        'createDocument', 
        null, 
        error instanceof Error ? error.message : 'Failed to create document'
      );
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

  private async executeAddFieldToDocuments(
    collectionName: string,
    fieldName: string,
    fieldType: string,
    defaultValue: any
  ): Promise<{ modifiedCount: number }> {
    const collection = this.getDB().collection(collectionName);
    const convertedValue = this.convertFieldValue(defaultValue, fieldType);
    
    const result = await collection.updateMany(
      { [fieldName]: { $exists: false } },
      { $set: { [fieldName]: convertedValue } }
    );
    
    return { modifiedCount: result.modifiedCount };
  }

  private async updateSchemaForAddField(
    collectionName: string,
    fieldName: string,
    fieldType: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const schemaState = await this.getSchemaState(collectionName);
      
      let newSchema: Record<string, string>;
      if (schemaState.isEmpty) {
        // Empty collection - create minimal schema
        newSchema = { _id: 'objectId', [fieldName]: fieldType };
      } else {
        // Add to existing schema
        newSchema = { ...schemaState.currentSchema, [fieldName]: fieldType };
      }
      
      const jsonSchema = this.convertInferredSchemaToJsonSchema(newSchema);
      await this.applyJsonSchemaToCollection(collectionName, jsonSchema);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Schema update failed'
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
      // 1. Validation
      const validation = await this.validateFieldOperation(collectionName, {
        operation: 'add',
        fieldName,
        fieldType
      });
      if (!validation.success) {
        return { success: false, error: validation.error };
      }
      
      // 2. Execute document operation
      const documentResult = await this.executeAddFieldToDocuments(collectionName, fieldName, fieldType, defaultValue);
      
      // 3. Execute schema operation
      const schemaResult = await this.updateSchemaForAddField(collectionName, fieldName, fieldType);
      
      // 4. Handle results
      return this.handleOperationResult({
        documentResult,
        schemaResult,
        operation: 'addField'
      });
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add field'
      };
    }
  }

  private async executeRenameFieldInDocuments(
    collectionName: string, 
    oldFieldName: string, 
    newFieldName: string
  ): Promise<{ modifiedCount: number }> {
    const collection = this.getDB().collection(collectionName);
    const result = await collection.updateMany(
      { [oldFieldName]: { $exists: true } },
      { $rename: { [oldFieldName]: newFieldName } }
    );
    return { modifiedCount: result.modifiedCount };
  }

  private async updateSchemaForRenameField(
    collectionName: string, 
    oldFieldName: string, 
    newFieldName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const schemaState = await this.getSchemaState(collectionName);
      
      if (schemaState.hasJsonSchema && oldFieldName in schemaState.currentSchema) {
        const fieldType = schemaState.currentSchema[oldFieldName];
        const updatedSchema = { ...schemaState.currentSchema };
        delete updatedSchema[oldFieldName];
        updatedSchema[newFieldName] = fieldType;
        
        const jsonSchema = this.convertInferredSchemaToJsonSchema(updatedSchema);
        await this.applyJsonSchemaToCollection(collectionName, jsonSchema);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Schema update failed'
      };
    }
  }

  async renameField(
    collectionName: string,
    oldFieldName: string,
    newFieldName: string
  ): Promise<ApiResponse<{ modifiedCount: number }>> {
    try {
      // 1. Validation
      const validation = await this.validateFieldOperation(collectionName, {
        operation: 'rename',
        oldFieldName,
        newFieldName
      });
      if (!validation.success) {
        return { success: false, error: validation.error };
      }
      
      // 2. Execute document operation
      const documentResult = await this.executeRenameFieldInDocuments(collectionName, oldFieldName, newFieldName);
      
      // 3. Execute schema operation
      const schemaResult = await this.updateSchemaForRenameField(collectionName, oldFieldName, newFieldName);
      
      // 4. Handle results
      return this.handleOperationResult({
        documentResult,
        schemaResult,
        operation: 'renameField'
      });
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rename field'
      };
    }
  }

  private async executeRemoveFieldFromDocuments(
    collectionName: string, 
    fieldName: string
  ): Promise<{ modifiedCount: number }> {
    const collection = this.getDB().collection(collectionName);
    const result = await collection.updateMany(
      { [fieldName]: { $exists: true } },
      { $unset: { [fieldName]: "" } }
    );
    return { modifiedCount: result.modifiedCount };
  }

  private async updateSchemaForRemoveField(
    collectionName: string, 
    fieldName: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const schemaState = await this.getSchemaState(collectionName);
      
      if (schemaState.hasJsonSchema && fieldName in schemaState.currentSchema) {
        const updatedSchema = { ...schemaState.currentSchema };
        delete updatedSchema[fieldName];
        
        const jsonSchema = this.convertInferredSchemaToJsonSchema(updatedSchema);
        await this.applyJsonSchemaToCollection(collectionName, jsonSchema);
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Schema update failed'
      };
    }
  }

  async removeField(
    collectionName: string,
    fieldName: string
  ): Promise<ApiResponse<{ modifiedCount: number }>> {
    try {
      // 1. Validation
      const validation = await this.validateFieldOperation(collectionName, {
        operation: 'remove',
        fieldName
      });
      if (!validation.success) {
        return { success: false, error: validation.error };
      }
      
      // 2. Execute document operation
      const documentResult = await this.executeRemoveFieldFromDocuments(collectionName, fieldName);
      
      // 3. Execute schema operation
      const schemaResult = await this.updateSchemaForRemoveField(collectionName, fieldName);
      
      // 4. Handle results
      return this.handleOperationResult({
        documentResult,
        schemaResult,
        operation: 'removeField'
      });
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove field'
      };
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

  // utility functions for refactored schema operations

  private async validateDocumentOperation(
    collectionName: string,
    operation: 'create' | 'update' | 'delete',
    params: { documentId?: string; documentData?: any }
  ): Promise<ValidationResult> {
    // Common validation for document operations
    if (operation === 'update' || operation === 'delete') {
      if (!params.documentId || !ObjectId.isValid(params.documentId)) {
        return { success: false, error: 'Invalid document ID' };
      }
    }
    
    if (operation === 'create' || operation === 'update') {
      if (!params.documentData || typeof params.documentData !== 'object') {
        return { success: false, error: 'Invalid document data' };
      }
    }
    
    return { success: true };
  }

  private async validateAndConvertDocumentData(
    collectionName: string, 
    documentData: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const schemaState = await this.getSchemaState(collectionName);
      
      if (!schemaState.isEmpty) {
        const convertedData: any = {};
        for (const [field, value] of Object.entries(documentData)) {
          if (field === '_id') {
            // Skip _id field - let MongoDB handle it
            continue;
          }
          
          if (field in schemaState.currentSchema) {
            // Convert based on schema type
            convertedData[field] = this.convertFieldValue(value, schemaState.currentSchema[field]);
          } else {
            // Keep unknown fields as-is (schema allows additional properties)
            convertedData[field] = value;
          }
        }
        return { success: true, data: convertedData };
      }
      
      // No schema - return data as-is (excluding _id)
      const { _id, ...dataWithoutId } = documentData;
      return { success: true, data: dataWithoutId };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert document data'
      };
    }
  }

  private handleDocumentOperationResult<T>(
    operation: string,
    result: T,
    error?: string
  ): ApiResponse<T> {
    if (error) {
      console.warn(`${operation} failed:`, error);
      return { success: false, error };
    }
    return { success: true, data: result };
  }

  private async getSchemaState(collectionName: string): Promise<SchemaState> {
    const schemaResponse = await this.getCollectionSchema(collectionName);
    
    if (!schemaResponse.success || !schemaResponse.data) {
      return { hasJsonSchema: false, hasInferredSchema: false, currentSchema: {}, isEmpty: true };
    }
    
    if (schemaResponse.data.jsonSchema) {
      return {
        hasJsonSchema: true,
        hasInferredSchema: false,
        currentSchema: this.extractFieldsFromJsonSchema(schemaResponse.data.jsonSchema),
        isEmpty: false
      };
    }
    
    if (schemaResponse.data.inferredSchema) {
      return {
        hasJsonSchema: false,
        hasInferredSchema: true,
        currentSchema: schemaResponse.data.inferredSchema,
        isEmpty: false
      };
    }
    
    return { hasJsonSchema: false, hasInferredSchema: false, currentSchema: {}, isEmpty: true };
  }

  private async validateFieldOperation(
    collectionName: string, 
    params: FieldOperationParams
  ): Promise<ValidationResult> {
    // Common field name validation
    if (params.operation === 'add' || params.operation === 'remove') {
      if (!params.fieldName || params.fieldName.trim() === '') {
        return { success: false, error: 'Field name cannot be empty' };
      }
    }
    
    if (params.operation === 'rename') {
      if (!params.oldFieldName || !params.newFieldName || 
          params.oldFieldName.trim() === '' || params.newFieldName.trim() === '') {
        return { success: false, error: 'Field names cannot be empty' };
      }
      if (params.oldFieldName === params.newFieldName) {
        return { success: false, error: 'New field name must be different from current name' };
      }
    }
    
    // Field existence validation
    const schemaState = await this.getSchemaState(collectionName);
    const collection = this.getDB().collection(collectionName);
    
    switch (params.operation) {
      case 'add':
        if (params.fieldName! in schemaState.currentSchema) {
          return { success: false, error: 'Field already exists' };
        }
        // Check in documents if no schema
        if (schemaState.isEmpty) {
          const sampleDoc = await collection.findOne({});
          if (sampleDoc && params.fieldName! in sampleDoc) {
            return { success: false, error: 'Field already exists' };
          }
        }
        break;
        
      case 'remove':
        // Field must exist somewhere to be removed
        const hasInSchema = params.fieldName! in schemaState.currentSchema;
        const hasInDocs = await collection.findOne({ [params.fieldName!]: { $exists: true } });
        if (!hasInSchema && !hasInDocs) {
          return { success: false, error: 'Field does not exist' };
        }
        break;
        
      case 'rename':
        // Old field must exist, new field must not exist
        const oldExists = await collection.findOne({ [params.oldFieldName!]: { $exists: true } });
        if (!oldExists) {
          return { success: false, error: 'Field to rename does not exist' };
        }
        const newExists = await collection.findOne({ [params.newFieldName!]: { $exists: true } });
        if (newExists) {
          return { success: false, error: 'A field with the new name already exists' };
        }
        break;
    }
    
    return { success: true };
  }

  private convertFieldValue(value: any, fieldType: string): any {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    
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

  private handleOperationResult(results: OperationResults): ApiResponse<{ modifiedCount: number }> {
    // Always return success if document operation succeeded
    // Log schema warnings but don't fail the operation
    if (results.schemaResult && !results.schemaResult.success) {
      console.warn(`${results.operation} succeeded but schema update failed:`, results.schemaResult.error);
    }
    
    return {
      success: true,
      data: { modifiedCount: results.documentResult?.modifiedCount || 0 }
    };
  }
}