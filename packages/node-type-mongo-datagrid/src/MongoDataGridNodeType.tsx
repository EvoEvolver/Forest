import React, {useEffect, useState} from 'react';
import {Box, Button, Paper, TextField} from '@mui/material';
import {MongoDataGridEditor} from './components/MongoDataGridEditor';
import {NodeM, NodeVM} from '@forest/schema';
import {httpUrl} from "@forest/schema/src/config";
import {NodeTypeVM} from "@forest/schema/src/nodeTypeVM";
import {NodeTypeM} from "@forest/schema/src/nodeTypeM";

export class MongoDataGridNodeTypeM extends NodeTypeM {

    static displayName = "Mongo DataGrid";
    static allowReshape = true;
    static allowAddingChildren = false;
    static allowEditTitle = true;
    static allowedChildrenTypes: string[] = [];


    static renderPrompt(node: NodeM): string {
        const collectionName = this.getCollectionName(node);
        return `MongoDB DataGrid for collection: ${collectionName || 'No collection selected'}`;
    }

    static ydataInitialize(node: NodeM): void {
        const ydata = node.ydata();
        if (ydata && !ydata.has('collectionName')) {
            ydata.set('collectionName', '');
        }
        if (ydata && !ydata.has('gridConfig')) {
            ydata.set('gridConfig', {});
        }
    }

    static getCollectionName(node: any): string {
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
const CollectionSelectorTool: React.FC<{ node: NodeVM }> = ({node}) => {
    const [collectionName, setCollectionName] = useState<string>('');
    const [isCreating, setIsCreating] = useState<boolean>(false);

    useEffect(() => {
        // Get initial collection ID from ydata
        const ydata = node.nodeM.ydata();
        if (ydata) {
            const initialCollectionName = ydata.get('collectionName') || '';
            setCollectionName(initialCollectionName);

            // Listen for changes to collection ID
            const observer = () => {
                const newCollectionName = ydata.get('collectionName') || '';
                setCollectionName(newCollectionName);
            };

            ydata.observe(observer);

            return () => {
                ydata.unobserve(observer);
            };
        }
    }, [node]);

    const handleCollectionNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newCollectionName = event.target.value;
        setCollectionName(newCollectionName);

        const ydata = node.nodeM.ydata();
        if (ydata) {
            ydata.set('collectionName', newCollectionName);
        }
    };

    const handleCreateCollection = async () => {
        setIsCreating(true);
        try {
            const response = await fetch(httpUrl + '/api/datanode/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data?.collectionName) {
                    const ydata = node.nodeM.ydata();
                    if (ydata) {
                        ydata.set('collectionName', result.data.collectionName);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to create collection:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Box sx={{p: 2, display: 'flex', flexDirection: 'column', gap: 2}}>
            <TextField
                label="Collection Name"
                value={collectionName}
                onChange={handleCollectionNameChange}
                placeholder="Enter collection Name"
                size="small"
                fullWidth
            />

            {!collectionName && (
                <Button
                    variant="contained"
                    onClick={handleCreateCollection}
                    disabled={isCreating}
                    size="small"
                >
                    {isCreating ? 'Creating...' : 'Create New Collection'}
                </Button>
            )}
        </Box>
    );
};

export class MongoDataGridNodeTypeVM extends NodeTypeVM {
    static render(node: NodeVM): React.ReactNode {
        return <MongoDataGridRenderer node={node}/>;
    }

    static renderTool1(node: NodeVM): React.ReactNode {
        return <CollectionSelectorTool node={node}/>;
    }

    static renderTool2(node: NodeVM): React.ReactNode {
        return null;
    }
}

// Separate renderer component to handle state and effects
const MongoDataGridRenderer: React.FC<{ node: NodeVM }> = ({node}) => {
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
        <Paper sx={{p: 2, minHeight: 600, display: 'flex', flexDirection: 'column'}}>
            {/* Data Grid takes full space */}
            <Box sx={{flexGrow: 1, minHeight: 0}}>
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