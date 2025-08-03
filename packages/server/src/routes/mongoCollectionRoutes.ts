import express, { Router } from 'express';
import { MongoEditorService } from '../services/mongoEditorService';

export const createMongoCollectionRouter = (): Router => {
  const router: Router = express.Router();

  // Test connection to the configured database
  router.post('/test-connection', async (req, res) => {
    try {
      const service = MongoEditorService.getInstance();
      const result = await service.testConnection();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      });
    }
  });

  // List collections in the configured database
  router.get('/', async (req, res) => {
    try {
      const service = MongoEditorService.getInstance();
      const result = await service.listCollections();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to list collections' 
      });
    }
  });

  // Get collection statistics
  router.get('/:collection/stats', async (req, res) => {
    try {
      const { collection } = req.params;
      
      const service = MongoEditorService.getInstance();
      const result = await service.getCollectionStats(collection);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get collection stats' 
      });
    }
  });

  // Get collection schema
  router.get('/:collection/schema', async (req, res) => {
    try {
      const { collection } = req.params;
      
      const service = MongoEditorService.getInstance();
      const result = await service.getCollectionSchema(collection);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get collection schema' 
      });
    }
  });

  // Get documents from a collection
  router.get('/:collection', async (req, res) => {
    try {
      const { collection } = req.params;
      const { page = '1', limit = '25' } = req.query;
      
      const service = MongoEditorService.getInstance();
      const result = await service.getDocuments(
        collection, 
        parseInt(page as string), 
        parseInt(limit as string)
      );
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get documents' 
      });
    }
  });

  // Update a document
  router.put('/:collection/:id', async (req, res) => {
    try {
      const { collection, id } = req.params;
      const updateData = req.body;
      
      const service = MongoEditorService.getInstance();
      const result = await service.updateDocument(collection, id, updateData);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update document' 
      });
    }
  });

  // Create a new document
  router.post('/:collection', async (req, res) => {
    try {
      const { collection } = req.params;
      const documentData = req.body;
      
      const service = MongoEditorService.getInstance();
      const result = await service.createDocument(collection, documentData);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create document' 
      });
    }
  });

  // Delete a document
  router.delete('/:collection/:id', async (req, res) => {
    try {
      const { collection, id } = req.params;
      
      const service = MongoEditorService.getInstance();
      const result = await service.deleteDocument(collection, id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete document' 
      });
    }
  });

  // Add a field to all documents in a collection
  router.post('/:collection/add-field', async (req, res) => {
    try {
      const { collection } = req.params;
      const { fieldName, fieldType, defaultValue } = req.body;
      
      // Validate required parameters
      if (!fieldName) {
        return res.status(400).json({
          success: false,
          error: 'Field name is required'
        });
      }
      
      if (!fieldType) {
        return res.status(400).json({
          success: false,
          error: 'Field type is required'
        });
      }
      
      // Validate field type
      const validTypes = ['string', 'number', 'boolean', 'date', 'object', 'array'];
      if (!validTypes.includes(fieldType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid field type. Must be one of: ${validTypes.join(', ')}`
        });
      }
      
      const service = MongoEditorService.getInstance();
      const result = await service.addField(collection, fieldName, fieldType, defaultValue);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add field' 
      });
    }
  });

  // Rename a field in all documents in a collection
  router.put('/:collection/fields/:fieldName', async (req, res) => {
    try {
      const { collection, fieldName } = req.params;
      const { newFieldName } = req.body;
      
      // Validate required parameters
      if (!newFieldName) {
        return res.status(400).json({
          success: false,
          error: 'New field name is required'
        });
      }
      
      // Validate field name format (basic MongoDB field name rules)
      const fieldNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      if (!fieldNameRegex.test(newFieldName)) {
        return res.status(400).json({
          success: false,
          error: 'Field name must start with a letter or underscore and contain only letters, numbers, and underscores'
        });
      }
      
      // Don't allow renaming _id field
      if (fieldName === '_id') {
        return res.status(400).json({
          success: false,
          error: 'Cannot rename _id field'
        });
      }
      
      const service = MongoEditorService.getInstance();
      const result = await service.renameField(collection, fieldName, newFieldName);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to rename field' 
      });
    }
  });

  // Remove a field from all documents in a collection
  router.delete('/:collection/fields/:fieldName', async (req, res) => {
    try {
      const { collection, fieldName } = req.params;
      
      // Don't allow removing _id field
      if (fieldName === '_id') {
        return res.status(400).json({
          success: false,
          error: 'Cannot remove _id field'
        });
      }
      
      const service = MongoEditorService.getInstance();
      const result = await service.removeField(collection, fieldName);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove field' 
      });
    }
  });

  return router;
};