import React, { useState, useEffect } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Typography, 
  Alert,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { NodeVM } from "@forest/schema";
import { httpUrl } from "@forest/schema/src/config";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface CollectionSelectorProps {
  node: NodeVM;
  selectedCollection: string;
  onCollectionChange: (collectionName: string) => void;
}

export const CollectionSelector: React.FC<CollectionSelectorProps> = ({
  node,
  selectedCollection,
  onCollectionChange
}) => {
  const [collections, setCollections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  useEffect(() => {
    testConnection();
    loadCollections();
  }, []);

  const testConnection = async () => {
    try {
      const response = await fetch(`${httpUrl}/api/collections/test-connection`, {
        method: 'POST',
      });
      const result: ApiResponse = await response.json();
      
      if (result.success) {
        setConnectionStatus('connected');
        setError(null);
      } else {
        setConnectionStatus('error');
        setError(result.error || 'Connection test failed');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'Connection test failed');
    }
  };

  const loadCollections = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${httpUrl}/api/collections`);
      const result: ApiResponse<string[]> = await response.json();
      
      if (result.success && result.data) {
        setCollections(result.data);
      } else {
        setError(result.error || 'Failed to load collections');
        setCollections([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load collections');
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionChange = (event: SelectChangeEvent<string>) => {
    const newCollection = event.target.value;
    onCollectionChange(newCollection);
    
    // Store the selected collection in the node's ydata
    const ydata = node.nodeM.ydata();
    if (ydata) {
      ydata.set('collectionName', newCollection);
    }
  };

  if (connectionStatus === 'error') {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Database connection failed: {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {connectionStatus !== 'connected' && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Could not connect to the database.
        </Alert>
      )}

      <FormControl fullWidth>
        <InputLabel id="collection-select-label">Select Collection</InputLabel>
        <Select
          labelId="collection-select-label"
          id="collection-select"
          value={selectedCollection}
          label="Select Collection"
          onChange={handleCollectionChange}
          disabled={loading || connectionStatus !== 'connected'}
          startAdornment={loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
        >
          {collections.map((collection) => (
            <MenuItem key={collection} value={collection}>
              {collection}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {collections.length === 0 && !loading && !error && connectionStatus === 'connected' && (
        <Alert severity="info" sx={{ mt: 2 }}>
          No collections found in the database
        </Alert>
      )}
    </Box>
  );
};