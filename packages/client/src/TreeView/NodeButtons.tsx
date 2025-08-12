import {useAtomValue, useSetAtom} from "jotai";
import {
    scrollToNodeAtom,
    setToNodeChildrenAtom,
    setToNodeParentAtom,
    addNewNodeAtom
} from "../TreeState/TreeState";
import {useTheme} from "@mui/system";
import {Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AddIcon from "@mui/icons-material/Add";
import React, { useState, useEffect } from "react";
import {NodeVM} from "@forest/schema";

interface childTypesForDisplay {
    name: string;
    displayName: string;
}

export const NodeButtons = (props: { node: NodeVM }) => {

    const setToNodeChildren = useSetAtom(setToNodeChildrenAtom)
    const setToNodeParent = useSetAtom(setToNodeParentAtom)
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    const addNewNode = useSetAtom(addNewNodeAtom)
    const nodeChildren = useAtomValue(props.node.children)
    const theme = useTheme()
    const node = props.node;
    
    const [dialogOpen, setDialogOpen] = useState(false);
    const [availableTypesForDisplay, setAvailableTypesForDisplay] = useState<childTypesForDisplay[]>([]);
    
    const availableTypeNames = node.nodeType.allowedChildrenTypes;

    useEffect(() => {
        const fetchTypes = async () => {
            const promises = availableTypeNames.map(async (typeName) => {
                const nodeType = node.treeVM.treeM.supportedNodesTypes(typeName);
                return {
                    name: typeName,
                    displayName: nodeType.displayName
                };
            });
            const availableTypes = await Promise.all(promises);
            setAvailableTypesForDisplay(availableTypes);
        };
        fetchTypes();
    }, [availableTypeNames, node.treeVM]);

    const onLeftBtn = () => {
        setToNodeParent(node.id)
        if (scrollToNode) {
            setTimeout(() => {
                scrollToNode(node.parent)
            }, 100)
        }
    }
    const onRightBtn = () => {
        setToNodeChildren(node.id)
    }

    const handleAddChild = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        
        if (availableTypesForDisplay.length === 1) {
            addNewNode({
                parentId: node.id,
                positionId: null,
                nodeTypeName: availableTypesForDisplay[0].name
            });
            return;
        }
        
        setDialogOpen(true);
    };

    const handleClose = () => {
        setDialogOpen(false);
    };

    const handleAdd = (nodeTypeName: string) => {
        addNewNode({
            parentId: node.id,
            positionId: null,
            nodeTypeName
        });
        handleClose();
    };

    return <div
        style={{
            height: '2rem',
            paddingLeft: '10px',
            paddingRight: '10px',
            position: 'relative'
        }}
    >
        {node.parent && <Button
            size="small"
            variant="contained"
            onClick={() => onLeftBtn()}
            style={{
                //align left
                position: 'absolute',
                left: '0',
                width: "40%",
                color: 'white',
                backgroundColor: theme.palette.primary.main
            }}
        ><ArrowBackIcon></ArrowBackIcon>
        </Button>}
        {nodeChildren.length > 0 ? (
            <Button
                size="small"
                variant="contained"
                onClick={() => onRightBtn()}
                style={{
                    // align right
                    position: 'absolute',
                    right: '0',
                    width: "40%",
                    color: 'white',
                    backgroundColor: theme.palette.primary.main
                }}
            >
                <ArrowForwardIcon></ArrowForwardIcon> <span>({node.data['children_count']} more)</span>
            </Button>
        ) : (
            node.nodeType.allowAddingChildren && (
                <Tooltip title="Add Child" placement="top">
                    <IconButton
                        size="small"
                        onClick={handleAddChild}
                        sx={{
                            position: 'absolute',
                            right: '0',
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            color: theme.palette.primary.main,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            '&:hover': {
                                backgroundColor: theme.palette.primary.light + '20',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }
                        }}
                    >
                        <AddIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )
        )}
        
        {/* Dialog for choosing child type */}
        <Dialog
            open={dialogOpen}
            onClose={handleClose}
        >
            <DialogTitle>Choose Child Type</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Select the type of child node to add:
                </DialogContentText>
                {availableTypesForDisplay.map((type) => (
                    <Button
                        key={type.name}
                        fullWidth
                        variant="outlined"
                        onClick={() => handleAdd(type.name)}
                        sx={{ mb: 1, justifyContent: 'flex-start' }}
                    >
                        {type.displayName}
                    </Button>
                ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    </div>
}