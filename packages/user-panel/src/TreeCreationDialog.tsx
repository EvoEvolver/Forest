import React, { useEffect, useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import { useAtomValue } from 'jotai';
import { authTokenAtom } from '@forest/user-system/src/authStates';
import { NodeJson, TreeJson, TreeMetadata } from '@forest/schema';
import { supportedNodeTypesM } from '@forest/node-types/src/model';

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`;

interface NodeTypeForDisplay {
    name: string;
    displayName: string;
}

interface TreeCreationDialogProps {
    open: boolean;
    onClose: () => void;
}

export const TreeCreationDialog: React.FC<TreeCreationDialogProps> = ({ open, onClose }) => {
    const [availableNodeTypes, setAvailableNodeTypes] = useState<NodeTypeForDisplay[]>([]);
    const authToken = useAtomValue(authTokenAtom);

    useEffect(() => {
        const loadNodeTypes = async () => {
            const nodeTypeNames = [
                "EditorNodeType",
                "AgentNodeType"
            ];

            const promises = nodeTypeNames.map(async (typeName) => {
                try {
                    const nodeType = await supportedNodeTypesM(typeName);
                    return {
                        name: typeName,
                        displayName: nodeType?.displayName || typeName
                    };
                } catch (error) {
                    console.warn(`Failed to load node type ${typeName}:`, error);
                    return null;
                }
            });

            const nodeTypes = await Promise.all(promises);
            setAvailableNodeTypes(nodeTypes.filter(type => type !== null) as NodeTypeForDisplay[]);
        };

        loadNodeTypes();
    }, []);

    const handleApiResponse = async (response: Response, errorContext: string) => {
        if (!response.ok) {
            const status = response.status;
            if (status === 401) throw new Error("AUTHENTICATION_FAILED");
            if (status === 403) throw new Error("PERMISSION_DENIED");
            throw new Error(`HTTP_ERROR_${status}`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
    };

    const handleCreateTree = async (nodeTypeName: string = "EditorNodeType") => {
        const nodeId = uuidv4();
        const newRootJson: NodeJson = {
            title: "Root",
            children: [],
            id: nodeId,
            parent: null,
            data: {},
            nodeTypeName: nodeTypeName
        };
        const newTreeMetadata: TreeMetadata = {
            rootId: newRootJson.id
        };
        const newTreeJson: TreeJson = {
            nodeDict: {
                [nodeId]: newRootJson
            },
            metadata: newTreeMetadata
        };

        try {
            const data = await handleApiResponse(
                await fetch(httpUrl + "/api/createTree", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({"tree": newTreeJson})
                }),
                "create tree"
            );
            if (!data.tree_id) throw new Error("No tree_id returned from server");
            window.location.href = `${window.location.origin}/?id=${data.tree_id}`;

        } catch (error) {
            console.error("Error creating tree:", error);
            throw error;
        }
    };

    const handleSelectNodeType = (nodeTypeName: string) => {
        handleCreateTree(nodeTypeName);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Choose Root Node Type</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Select the type of root node for your new tree:
                </DialogContentText>
                {availableNodeTypes.map((type) => (
                    <Button
                        key={type.name}
                        fullWidth
                        variant="outlined"
                        onClick={() => handleSelectNodeType(type.name)}
                        sx={{ mb: 1, justifyContent: 'flex-start' }}
                    >
                        {type.displayName}
                    </Button>
                ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
};