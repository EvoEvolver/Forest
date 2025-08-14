import {atom, useAtomValue, useSetAtom} from "jotai";
import {addNewNodeAtom, jumpToNodeAtom, scrollToNodeAtom, treeAtom} from "../TreeState/TreeState";
import {palette, useTheme} from "@mui/system";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    IconButton,
    Tooltip, Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import React, {useEffect, useMemo, useState} from "react";
import {NodeVM} from "@forest/schema";

interface childTypesForDisplay {
    name: string;
    displayName: string;
}

export const NodeButtons = (props: { node: NodeVM }) => {
    const jumpToNode = useSetAtom(jumpToNodeAtom)
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    const addNewNode = useSetAtom(addNewNodeAtom)
    const nodeChildrenIds = useAtomValue(props.node.children)
    const tree = useAtomValue(treeAtom)
    const nodeChildrenIdTitleAtom = useMemo(() => {
        return atom(get => {
            return nodeChildrenIds.map(childId => {
                return {
                    "id": childId,
                    "title": get(get(tree.nodeDict[childId]).title)
                }
            });
        })
    }, [nodeChildrenIds, tree.nodeDict]);
    const nodeChildrenIdTitle = useAtomValue(nodeChildrenIdTitleAtom);


    const theme = useTheme()
    const node = props.node;

    const [dialogOpen, setDialogOpen] = useState(false);
    const [availableTypesForDisplay, setAvailableTypesForDisplay] = useState<childTypesForDisplay[]>([]);

    const availableTypeNames = node.nodeType.allowedChildrenTypes;

    useEffect(() => {
        const fetchTypes = async () => {
            const promises = availableTypeNames.map(async (typeName) => {
                const nodeType = node.treeVM.treeM.supportedNodeTypesM(typeName);
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

    const handleChildClick = (childId: string) => {
        jumpToNode(childId);
        if (scrollToNode) {
            scrollToNode(childId);
        }
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

    return <>
        <Divider><Typography variant={"body2"} color={theme.palette.text.secondary}>Children</Typography></Divider>
        <div
            style={{
                minHeight: '2rem',
                paddingLeft: '10px',
                paddingRight: '10px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center'
            }}
        >

            {nodeChildrenIdTitle.length > 0 ? (
                nodeChildrenIdTitle.map(({id, title}) => (
                    <Button
                        key={id}
                        size="small"
                        variant="outlined"
                        onClick={() => handleChildClick(id)}
                        style={{
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            minWidth: 'auto',
                            padding: '4px 8px'
                        }}
                    >
                        {title || 'Untitled'}
                    </Button>
                ))
            ) : (
                node.nodeType.allowAddingChildren && (
                    <Tooltip title="Add Child" placement="top">
                        <IconButton
                            size="small"
                            onClick={handleAddChild}
                            sx={{
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
                            <AddIcon fontSize="small"/>
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
                            sx={{mb: 1, justifyContent: 'flex-start'}}
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
    </>
}