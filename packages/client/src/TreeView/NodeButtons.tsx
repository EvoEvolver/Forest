import {useAtomValue, useSetAtom} from "jotai";
import {
    addNewNodeAtom,
    deleteNodeAtom,
    scrollToNodeAtom,
    setNodePositionAtom,
    setToNodeChildrenAtom,
    setToNodeParentAtom,
    treeAtom
} from "../TreeState/TreeState";
import {useTheme} from "@mui/system";
import {Button, Divider, ListItemIcon, ListItemText, Menu, MenuItem, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BlurOnIcon from "@mui/icons-material/BlurOn";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import React, {useEffect} from "react";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArchiveIcon from '@mui/icons-material/Archive';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TagIcon from '@mui/icons-material/Tag';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {NodeVM, NodeM} from "@forest/schema";
import {userAtom} from "@forest/user-system/src/authStates";
import {httpUrl, treeId} from "../appState";
import {StageVersionDialog} from "./StageVersionDialog";

export const NodeButtons = (props: { node: NodeVM }) => {

    const setToNodeChildren = useSetAtom(setToNodeChildrenAtom)
    const setToNodeParent = useSetAtom(setToNodeParentAtom)
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    const nodeChildren = useAtomValue(props.node.children)
    const theme = useTheme()
    const node = props.node;

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

    return <div
        style={{
            height: '2rem',
            paddingLeft: '10px',
            paddingRight: '10px',
            paddingBottom: '5px',
            marginBottom: '10px',
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
                backgroundColor: theme.palette.primary.light
            }}
        ><ArrowBackIcon></ArrowBackIcon>
        </Button>}
        {
            <DropDownOperationButton node={node}/>
        }
        {nodeChildren.length > 0 && <Button
            size="small"
            variant="contained"
            onClick={() => onRightBtn()}
            style={{
                // align right
                position: 'absolute',
                right: '0',
                width: "40%",
                backgroundColor: theme.palette.primary.light
            }}
        ><ArrowForwardIcon></ArrowForwardIcon> <span>({node.data['children_count']} more)</span>
        </Button>}
    </div>
}

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
                const nodeType = await node.treeVM.supportedNodesTypes(typeName);
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
                <ListItemIcon>
                    <AddIcon/>
                </ListItemIcon>
                <ListItemText>{mode === 'child' ? 'Add Children' : 'Add Sibling'}</ListItemText>
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


const DropDownOperationButton = ({node}: { node: NodeVM }) => {

    const theme = useTheme();
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const deleteNode = useSetAtom(deleteNodeAtom)
    const setNodePosition = useSetAtom(setNodePositionAtom);
    const user = useAtomValue(userAtom)
    
    // Stage version dialog state
    const [stageDialogOpen, setStageDialogOpen] = React.useState(false);
    // Confirmation dialog state for delete
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
    const [pendingDeleteNodeId, setPendingDeleteNodeId] = React.useState<string | null>(null);

    const moveUp = () => {
        setNodePosition({
            nodeId: node.id,
            targetId: node.id,
            shift: -1 // Move up by 1 position
        });
    };

    const moveDown = () => {
        setNodePosition({
            nodeId: node.id,
            targetId: node.id,
            shift: 1 // Move down by 1 position
        });
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

    }

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const nodeChildren = useAtomValue(node.children)
    const nodeId: string = node.id;
    const tree = useAtomValue(treeAtom)
    const treeMetadata = useAtomValue(tree.metadata)
    const parentId = node.parent;
    let parentNode
    if (parentId) {
        parentNode = useAtomValue(tree.nodeDict[parentId])
    }
    let currentUrl = window.location.href;
    // remove all the query parameters
    currentUrl = currentUrl.split('?')[0];
    const nodeUrl = `${currentUrl}?id=${treeMetadata.treeId}&n=${nodeId}`;

    return (
        <>
            <Button
                variant="contained"
                size="small"
                onClick={handleClick}
                style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: "5%",
                    backgroundColor: theme.palette.primary.light
                }}
            >
                <BlurOnIcon/>
            </Button>
            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
            >
                {node.nodeType.allowAddingChildren &&
                    <AddNodeMenuItem node={node} onClose={handleClose} mode={"child"}/>
                }
                {parentId && parentNode.nodeType.allowAddingChildren &&
                    <AddNodeMenuItem node={parentNode} onClose={handleClose} mode={"sibling"}/>
                }
                {node.nodeType.allowReshape && [
                    <MenuItem key="moveUp" onClick={() => {
                        moveUp();
                        handleClose();
                    }}>
                        <ListItemIcon>
                            <ArrowUpwardIcon/>
                        </ListItemIcon>
                        Move Up
                    </MenuItem>,
                    <MenuItem key="moveDown" onClick={() => {
                        moveDown();
                        handleClose();
                    }}>
                        <ListItemIcon>
                            <ArrowDownwardIcon/>
                        </ListItemIcon>
                        <ListItemText>Move Down</ListItemText>
                    </MenuItem>,

                    <MenuItem key="stageVersion" onClick={() => {
                        handleStageVersion();
                        handleClose();
                    }}>
                        <ListItemIcon>
                            <TagIcon/>
                        </ListItemIcon>
                        <ListItemText>Stage version</ListItemText>
                    </MenuItem>,
                    <MenuItem key="agent" onClick={() => {
                        treeAgent()
                        handleClose();
                    }}>
                        <ListItemIcon>
                            <PsychologyIcon/>
                        </ListItemIcon>
                        <ListItemText>Tree agent</ListItemText>
                    </MenuItem>
                ]}
                <Divider/>
                {
                    node.data['archived'] === true ? (
                        <MenuItem key="unarchive" onClick={() => {
                            unarchiveNode();
                            handleClose();
                        }}>
                            <ListItemIcon>
                                <ArchiveIcon/>
                            </ListItemIcon>
                            <ListItemText>Unarchive</ListItemText>
                        </MenuItem>
                    ) : (
                        <MenuItem key="archive" onClick={() => {
                            archiveNode();
                            handleClose();
                        }}>
                            <ListItemIcon>
                                <ArchiveIcon/>
                            </ListItemIcon>
                            <ListItemText>Archive</ListItemText>
                        </MenuItem>
                    )
                }
                {node.nodeType.allowReshape &&
                    <MenuItem onClick={() => {
                        setPendingDeleteNodeId(nodeId);
                        setDeleteDialogOpen(true);
                        handleClose();
                    }}
                              disabled={nodeChildren.length > 0 || node.parent === null}
                    >
                        <ListItemIcon>
                            <DeleteIcon/>
                        </ListItemIcon>
                        <ListItemText>Delete node</ListItemText>
                    </MenuItem>}
                <MenuItem onClick={() => {
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(nodeUrl);
                        alert(`Node URL copied to clipboard: ${nodeUrl}`);
                    } else {
                        alert("Clipboard API not supported in non HTTPS context. Please copy the URL manually." + nodeUrl);
                    }
                    handleClose();
                }}>
                    <ListItemIcon>
                        <InsertLinkIcon/>
                    </ListItemIcon>
                    <ListItemText>Copy Node Link</ListItemText>
                </MenuItem>
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
                                deleteNode({ nodeId: pendingDeleteNodeId });
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

