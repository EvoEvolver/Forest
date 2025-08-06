import React, { useState, useEffect } from 'react';
import { Box, Paper } from '@mui/material';
import { CollectionSelector } from './components/CollectionSelector';
import { MongoDataGridEditor } from './components/MongoDataGridEditor';
import { NodeType, NodeVM, NodeM } from '@forest/schema';

export class MongoDataGridNodeType extends NodeType {
  displayName = "Mongo DataGrid";
  allowReshape = true;
  allowAddingChildren = false;
  allowEditTitle = true;
  allowedChildrenTypes: string[] = [];

  render(node: NodeVM): React.ReactNode {
    return <MongoDataGridRenderer node={node} />;
  }

  renderTool1(node: NodeVM): React.ReactNode {
    return <CollectionSelectorTool node={node} />;
  }

  renderTool2(node: NodeVM): React.ReactNode {
    return null;
  }

  renderPrompt(node: NodeM): string {
    const collectionName = this.getCollectionName(node);
    return `MongoDB DataGrid for collection: ${collectionName || 'No collection selected'}`;
  }

  ydataInitialize(node: NodeM): void {
    const ydata = node.ydata();
    if (ydata && !ydata.has('collectionName')) {
      ydata.set('collectionName', '');
    }
    if (ydata && !ydata.has('gridConfig')) {
      ydata.set('gridConfig', {});
    }
  }

  private getCollectionName(node: any): string {
    const ydata = node.nodeM ? node.nodeM.ydata() : node.ydata();
    return ydata?.get('collectionName') || '';
  }

  private setCollectionName(node: NodeVM, collectionName: string): void {
    const ydata = node.nodeM.ydata();
    if (ydata) {
      ydata.set('collectionName', collectionName);
    }
  }
}

// Collection selector for tool1
const CollectionSelectorTool: React.FC<{ node: NodeVM }> = ({ node }) => {
  const [collectionName, setCollectionName] = useState<string>('');

  useEffect(() => {
    // Get initial collection name from ydata
    const ydata = node.nodeM.ydata();
    if (ydata) {
      const initialCollection = ydata.get('collectionName') || '';
      setCollectionName(initialCollection);

      // Listen for changes to collection name
      const observer = () => {
        const newCollection = ydata.get('collectionName') || '';
        setCollectionName(newCollection);
      };

      ydata.observe(observer);

      return () => {
        ydata.unobserve(observer);
      };
    }
  }, [node]);

  const handleCollectionChange = (newCollectionName: string) => {
    const ydata = node.nodeM.ydata();
    if (ydata) {
      ydata.set('collectionName', newCollectionName);
    }
  };

  return (
    <CollectionSelector
      node={node}
      selectedCollection={collectionName}
      onCollectionChange={handleCollectionChange}
    />
  );
};

// Separate renderer component to handle state and effects
const MongoDataGridRenderer: React.FC<{ node: NodeVM }> = ({ node }) => {
  const [collectionName, setCollectionName] = useState<string>('');

  useEffect(() => {
    // Get initial collection name from ydata
    const ydata = node.nodeM.ydata();
    if (ydata) {
      const initialCollection = ydata.get('collectionName') || '';
      setCollectionName(initialCollection);

      // Listen for changes to collection name
      const observer = () => {
        const newCollection = ydata.get('collectionName') || '';
        setCollectionName(newCollection);
      };

      ydata.observe(observer);

      return () => {
        ydata.unobserve(observer);
      };
    }
  }, [node]);

  return (
    <Paper sx={{ p: 2, minHeight: 600, display: 'flex', flexDirection: 'column' }}>
      {/* Data Grid takes full space */}
      <Box sx={{ flexGrow: 1, minHeight: 0 }}>
        {collectionName ? (
          <MongoDataGridEditor
            node={node}
            collectionName={collectionName}
            readonly={false}
          />
        ) : (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minHeight: 300,
            color: 'text.secondary'
          }}>
            Please select a collection from the toolbar above
          </Box>
        )}
      </Box>
    </Paper>
  );
};