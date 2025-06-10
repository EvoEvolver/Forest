import {Node} from "../TreeState/entities";
import {useAtomValue, useSetAtom} from "jotai/index";
import {
    addNewNodeAtom,
    deleteNodeAtom,
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
import React from "react";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

export const NodeButtons = (props: { node: Node }) => {

    const setToNodeChildren = useSetAtom(setToNodeChildrenAtom)
    const setToNodeParent = useSetAtom(setToNodeParentAtom)
    const nodeChildren = useAtomValue(props.node.children)
    const theme = useTheme()
    const node = props.node;

    const onLeftBtn = (id) => {
        setToNodeParent(id)
    }
    const onRightBtn = (id) => {
        setToNodeChildren(id)
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
            onClick={() => onLeftBtn(node.id)}
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
            onClick={() => onRightBtn(node.id)}
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


const DropDownOperationButton = (props) => {

    const node = props.node;
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
    const treeId = tree.metadata.treeId
    const parentId = node.parent;
    let currentUrl = window.location.href;
    // remove all the query parameters
    currentUrl = currentUrl.split('?')[0];
    const nodeUrl = `${currentUrl}?id=${treeId}&n=${nodeId}`;

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
                <MenuItem onClick={() => {
                    addNewNode({
                        parentId: nodeId,
                        positionId: null,
                        tabs: {...node.tabs},
                        tools: [{...node.tools[0]}, {...node.tools[1]}]
                    })
                    handleClose();
                }}><ListItemIcon>
                    <AddIcon/>
                </ListItemIcon>
                    <ListItemText>Add Children</ListItemText></MenuItem>
                <MenuItem onClick={() => {
                    addNewNode({
                        parentId: parentId,
                        positionId: nodeId,
                        tabs: {...node.tabs},
                        tools: [{...node.tools[0]}, {...node.tools[1]}]
                    })
                    handleClose();
                }}><ListItemIcon>
                    <AddIcon/>
                </ListItemIcon>
                    <ListItemText>Add Sibling</ListItemText></MenuItem>
                <MenuItem onClick={() => {
                    moveUp();
                    handleClose();
                }}>
                    <ListItemIcon>
                        <ArrowUpwardIcon/>
                    </ListItemIcon>
                    Move Up
                </MenuItem>
                <MenuItem onClick={() => {
                    moveDown();
                    handleClose();
                }}>
                    <ListItemIcon>
                        <ArrowDownwardIcon/>
                    </ListItemIcon>
                    <ListItemText>Move Down</ListItemText>
                </MenuItem>
                <Divider/>
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
                </MenuItem>
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