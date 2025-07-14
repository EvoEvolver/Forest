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
import {Button, Divider, ListItemIcon, ListItemText, Menu, MenuItem} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BlurOnIcon from "@mui/icons-material/BlurOn";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import React, {useEffect} from "react";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {NodeVM} from "@forest/schema";

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

const AddChildrenMenuItem = ({node, onClose}: { node: NodeVM, onClose: () => void }) => {
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const addNewNode = useSetAtom(addNewNodeAtom);
    const [availableChildTypesForDisplay, setAvailableChildTypesForDisplay] = React.useState<childTypesForDisplay[]>([]);

    const availableChildrenTypeNames = node.nodeType.allowedChildrenTypes;

    useEffect(() => {
        const fetchChildTypes = async () => {
            const promises = availableChildrenTypeNames.map(async (typeName) => {
                const nodeType = await node.treeVM.supportedNodesTypes(typeName);
                console.log(typeName)
                return {
                    name: typeName,
                    displayName: nodeType.displayName
                };
            });
            const availableChildTypes = await Promise.all(promises);
            setAvailableChildTypesForDisplay(availableChildTypes);
        };

        fetchChildTypes();
    }, [availableChildrenTypeNames, node.treeVM]);

    const handleClick = (event: React.MouseEvent<HTMLLIElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleAddChild = (nodeTypeName: string) => {
        addNewNode({
            parentId: node.id,
            positionId: null,
            nodeTypeName: nodeTypeName
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
                <ListItemText>Add Children</ListItemText>
            </MenuItem>
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                {availableChildTypesForDisplay.map((type) => (
                    <MenuItem
                        key={type.name}
                        onClick={() => handleAddChild(type.name)}
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
    const addNewNode = useSetAtom(addNewNodeAtom)
    const deleteNode = useSetAtom(deleteNodeAtom)
    const setNodePosition = useSetAtom(setNodePositionAtom);

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
                    <AddChildrenMenuItem node={node} onClose={handleClose}/>
                }
                {node.nodeType.allowAddingChildren && <MenuItem onClick={() => {
                    addNewNode({
                        parentId: parentId,
                        positionId: nodeId,
                        nodeTypeName: node.nodeTypeName
                    })
                    handleClose();
                }}><ListItemIcon>
                    <AddIcon/>
                </ListItemIcon>
                    <ListItemText>Add Sibling</ListItemText></MenuItem>}
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
                    </MenuItem>
                ]}
                <Divider/>
                {node.nodeType.allowReshape &&
                    <MenuItem onClick={() => {
                        deleteNode({nodeId: nodeId});
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
        </>
    );
};

