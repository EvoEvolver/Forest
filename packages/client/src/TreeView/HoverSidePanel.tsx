import {useAtomValue, useSetAtom} from "jotai";
import {addNewNodeAtom, deleteNodeAtom, markedNodesAtom, toggleMarkedNodeAtom, treeAtom} from "../TreeState/TreeState";
import {useTheme} from "@mui/system";
import {
    Alert,
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
    Snackbar,
    Tooltip
} from "@mui/material";
import React, {useEffect} from "react";
import ArchiveIcon from '@mui/icons-material/Archive';
import TagIcon from '@mui/icons-material/Tag';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import {NodeVM} from "@forest/schema";
import {StageVersionDialog} from "./StageVersionDialog";
import Slide from '@mui/material/Slide';

interface childTypesForDisplay {
    "name": string,
    "displayName": string,
}

export const HoverSidePanel = (props: { node: NodeVM, isVisible: boolean, isDragging?: boolean }) => {
    const theme = useTheme()
    const node = props.node;
    const addNewNode = useSetAtom(addNewNodeAtom)
    const deleteNode = useSetAtom(deleteNodeAtom)
    const tree = useAtomValue(treeAtom)
    const nodeChildren = useAtomValue(node.children)
    const markedNodes = useAtomValue(markedNodesAtom)
    const toggleMarkedNode = useSetAtom(toggleMarkedNodeAtom)
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const [availableTypesForDisplay, setAvailableTypesForDisplay] = React.useState<childTypesForDisplay[]>([]);

    // Stage version dialog state
    const [stageDialogOpen, setStageDialogOpen] = React.useState(false);
    // Confirmation dialog state for delete
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [pendingDeleteNodeId, setPendingDeleteNodeId] = React.useState<string | null>(null);

    // Snackbar state for copy link
    const [copySuccess, setCopySuccess] = React.useState(false);

    const availableTypeNames = node.nodeType.allowedChildrenTypes


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
            setCopySuccess(true);
        } else {
            setCopySuccess(true); // Still show snackbar, but maybe with a different message if needed
        }
    };

    const handleToggleMarked = () => {
        toggleMarkedNode(node.id);
    };


    const isMarked = markedNodes.has(node.id);

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
                    zIndex: 1000,
                    minWidth: '48px'
                }}
            >

                {/* Stage Version */}
                <Tooltip title="Stage Version" placement="left">
                    <IconButton
                        size="small"
                        onClick={handleStageVersion}
                        sx={{
                            color: theme.palette.primary.main
                        }}
                    >
                        <TagIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>

                {/* Archive/Unarchive */}
                {node.nodeType.allowReshape &&
                    <Tooltip title={node.data['archived'] ? "Unarchive" : "Archive"} placement="left">
                        <IconButton
                            size="small"
                            onClick={node.data['archived'] ? unarchiveNode : archiveNode}
                            sx={{
                                color: theme.palette.primary.main
                            }}
                        >
                            <ArchiveIcon fontSize="small"/>
                        </IconButton>
                    </Tooltip>}

                {/* Copy Node Link */}
                <Tooltip title="Copy Node Link" placement="left">
                    <IconButton
                        size="small"
                        onClick={copyNodeLink}
                        sx={{
                            color: theme.palette.primary.main,
                            '&:hover': {backgroundColor: theme.palette.secondary.light + '20'}
                        }}
                    >
                        <InsertLinkIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>

                {/* Toggle Marked */}
                <Tooltip title={isMarked ? "Unmark Node" : "Mark Node"} placement="left">
                    <IconButton
                        size="small"
                        onClick={handleToggleMarked}
                        sx={{
                            color: theme.palette.primary.main
                        }}
                    >
                        {isMarked ? <CheckBoxIcon fontSize="small"/> : <CheckBoxOutlineBlankIcon fontSize="small"/>}
                    </IconButton>
                </Tooltip>

                {/* Delete Node */}
                {node.nodeType.allowReshape && nodeChildren.length === 0 && (
                    <Tooltip title="Delete Node" placement="left">
                        <IconButton
                            size="small"
                            onClick={deleteNodeHandler}
                            disabled={nodeChildren.length > 0 || node.parent === null}
                            sx={{
                                color: theme.palette.primary.main,
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

            {/* Snackbar for copy link */}
            <Snackbar
                open={copySuccess}
                autoHideDuration={1000}
                onClose={() => setCopySuccess(false)}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
                TransitionComponent={Slide}
            >
                <Alert onClose={() => setCopySuccess(false)} severity="success" sx={{width: '100%'}}>
                    Node URL copied to clipboard!
                </Alert>
            </Snackbar>

            {/* Stage Version Dialog */}
            <StageVersionDialog
                open={stageDialogOpen}
                onClose={() => setStageDialogOpen(false)}
                node={node}
            />
        </>
    );
};