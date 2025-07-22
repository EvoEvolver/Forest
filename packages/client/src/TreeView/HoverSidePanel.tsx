import {useAtomValue, useSetAtom} from "jotai";
import {addNewNodeAtom, deleteNodeAtom, treeAtom} from "../TreeState/TreeState";
import {useTheme} from "@mui/system";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip
} from "@mui/material";
import React, {useEffect} from "react";
import ArchiveIcon from '@mui/icons-material/Archive';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TagIcon from '@mui/icons-material/Tag';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {NodeVM} from "@forest/schema";
import {userAtom} from "@forest/user-system/src/authStates";
import {StageVersionDialog} from "./StageVersionDialog";

interface childTypesForDisplay {
    "name": string,
    "displayName": string,
}


interface AddNodeMenuItemProps {
    node: NodeVM;
    onClose: () => void;
    mode: 'child' | 'sibling';
}


const AddNodeMenuItem = ({node, onClose, mode}: AddNodeMenuItemProps) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const addNewNode = useSetAtom(addNewNodeAtom);
    const [availableTypesForDisplay, setAvailableTypesForDisplay] = React.useState<childTypesForDisplay[]>([]);

    const availableTypeNames = node.nodeType.allowedChildrenTypes

    useEffect(() => {
        const fetchTypes = async () => {
            const promises = availableTypeNames.map(async (typeName) => {
                const nodeType = await node.treeVM.treeM.supportedNodesTypes(typeName);
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

    const handleClick = (event: React.MouseEvent<HTMLLIElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleAdd = (nodeTypeName: string) => {

        addNewNode({
            parentId: node.id,
            positionId: null,
            nodeTypeName
        });

        handleClose();
        onClose();
    };

    return (
        <>
            <MenuItem onClick={handleClick}>
                <AddIcon/>
            </MenuItem>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{vertical: 'top', horizontal: 'right'}}
                transformOrigin={{vertical: 'top', horizontal: 'left'}}
            >
                {availableTypesForDisplay.map((type) => (
                    <MenuItem
                        key={type.name}
                        onClick={() => handleAdd(type.name)}
                    >
                        <ListItemText>{type.displayName}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
};


export const HoverSidePanel = (props: { node: NodeVM, isVisible: boolean }) => {
    const theme = useTheme()
    const node = props.node;
    const addNewNode = useSetAtom(addNewNodeAtom)
    const deleteNode = useSetAtom(deleteNodeAtom)
    const tree = useAtomValue(treeAtom)
    const user = useAtomValue(userAtom)
    const nodeChildren = useAtomValue(node.children)
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [availableTypesForDisplay, setAvailableTypesForDisplay] = React.useState<childTypesForDisplay[]>([]);

    // Stage version dialog state
    const [stageDialogOpen, setStageDialogOpen] = React.useState(false);
    // Confirmation dialog state for delete
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [pendingDeleteNodeId, setPendingDeleteNodeId] = React.useState<string | null>(null);

    const availableTypeNames = node.nodeType.allowedChildrenTypes

    const parentId = node.parent;
    let parentNode;
    if (parentId) {
        parentNode = useAtomValue(tree.nodeDict[parentId])
    }

    useEffect(() => {
        const fetchTypes = async () => {
            const promises = availableTypeNames.map(async (typeName) => {
                const nodeType = await node.treeVM.treeM.supportedNodesTypes(typeName);
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

    const handleAddChildClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleAdd = (nodeTypeName: string) => {
        addNewNode({
            parentId: node.id,
            positionId: null,
            nodeTypeName
        });
        handleClose();
    };

    const archiveNode = () => {
        node.data['archived'] = true;
        node.commitDataChange()
    }

    const unarchiveNode = () => {
        node.data['archived'] = false;
        node.commitDataChange()
    }

    const handleStageVersion = () => {
        setStageDialogOpen(true);
    };

    const treeAgent = () => {
        // Tree agent functionality - empty for now as in original
    }

    const deleteNodeHandler = () => {
        setPendingDeleteNodeId(node.id);
        setDeleteDialogOpen(true);
    };

    const copyNodeLink = () => {
        let currentUrl = window.location.href;
        currentUrl = currentUrl.split('?')[0];
        const nodeUrl = `${currentUrl}?id=${tree.treeM.id()}&n=${node.id}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(nodeUrl);
            alert(`Node URL copied to clipboard: ${nodeUrl}`);
        } else {
            alert("Clipboard API not supported in non HTTPS context. Please copy the URL manually." + nodeUrl);
        }
    };

    if (!props.isVisible) return null;

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    right: '-48px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: '12px',
                    padding: '8px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: `1px solid ${theme.palette.divider}`,
                    zIndex: 9999,
                    minWidth: '48px'
                }}
            >
                {/* Add Children */}
                {node.nodeType.allowAddingChildren &&
                    <AddNodeMenuItem node={node} onClose={handleClose} mode={"child"}/>
                }
                {parentId && parentNode.nodeType.allowAddingChildren &&
                    <AddNodeMenuItem node={parentNode} onClose={handleClose} mode={"sibling"}/>
                }

                {/* Stage Version */}
                <Tooltip title="Stage Version" placement="left">
                    <IconButton
                        size="small"
                        onClick={handleStageVersion}
                        sx={{
                            color: theme.palette.info.main,
                            '&:hover': {backgroundColor: theme.palette.info.light + '20'}
                        }}
                    >
                        <TagIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>

                {/* Tree Agent */}
                <Tooltip title="Tree Agent" placement="left">
                    <IconButton
                        size="small"
                        onClick={treeAgent}
                        sx={{
                            color: theme.palette.primary.main,
                            '&:hover': {backgroundColor: theme.palette.primary.light + '20'}
                        }}
                    >
                        <PsychologyIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>

                {/* Archive/Unarchive */}
                <Tooltip title={node.data['archived'] ? "Unarchive" : "Archive"} placement="left">
                    <IconButton
                        size="small"
                        onClick={node.data['archived'] ? unarchiveNode : archiveNode}
                        sx={{
                            color: theme.palette.warning.main,
                            '&:hover': {backgroundColor: theme.palette.warning.light + '20'}
                        }}
                    >
                        <ArchiveIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>

                {/* Copy Node Link */}
                <Tooltip title="Copy Node Link" placement="left">
                    <IconButton
                        size="small"
                        onClick={copyNodeLink}
                        sx={{
                            color: theme.palette.secondary.main,
                            '&:hover': {backgroundColor: theme.palette.secondary.light + '20'}
                        }}
                    >
                        <InsertLinkIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>

                {/* Delete Node */}
                {node.nodeType.allowReshape && (
                    <Tooltip title="Delete Node" placement="left">
                        <IconButton
                            size="small"
                            onClick={deleteNodeHandler}
                            disabled={nodeChildren.length > 0 || node.parent === null}
                            sx={{
                                color: theme.palette.error.main,
                                '&:hover': {backgroundColor: theme.palette.error.light + '20'},
                                '&:disabled': {color: theme.palette.action.disabled}
                            }}
                        >
                            <DeleteIcon fontSize="small"/>
                        </IconButton>
                    </Tooltip>
                )}
            </div>

            {/* Add Children Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{vertical: 'top', horizontal: 'left'}}
                transformOrigin={{vertical: 'top', horizontal: 'right'}}
            >
                {availableTypesForDisplay.map((type) => (
                    <MenuItem
                        key={type.name}
                        onClick={() => handleAdd(type.name)}
                    >
                        <ListItemText>{type.displayName}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this node? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            if (pendingDeleteNodeId) {
                                deleteNode({nodeId: pendingDeleteNodeId});
                            }
                            setDeleteDialogOpen(false);
                            setPendingDeleteNodeId(null);
                        }}
                        color="error"
                        variant="contained"
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Stage Version Dialog */}
            <StageVersionDialog
                open={stageDialogOpen}
                onClose={() => setStageDialogOpen(false)}
                node={node}
            />
        </>
    );
};