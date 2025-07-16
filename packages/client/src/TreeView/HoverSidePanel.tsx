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
import {IconButton, Tooltip} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import React from "react";
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import InsertLinkIcon from '@mui/icons-material/InsertLink';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {NodeVM} from "@forest/schema";

export const NodeButtons = (props: { node: NodeVM, isVisible: boolean }) => {
    const setToNodeChildren = useSetAtom(setToNodeChildrenAtom)
    const setToNodeParent = useSetAtom(setToNodeParentAtom)
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    const nodeChildren = useAtomValue(props.node.children)
    const theme = useTheme()
    const node = props.node;
    const addNewNode = useSetAtom(addNewNodeAtom)
    const deleteNode = useSetAtom(deleteNodeAtom)
    const setNodePosition = useSetAtom(setNodePositionAtom);
    const tree = useAtomValue(treeAtom)

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

    const moveUp = () => {
        setNodePosition({
            nodeId: node.id,
            targetId: node.id,
            shift: -1
        });
    };

    const moveDown = () => {
        setNodePosition({
            nodeId: node.id,
            targetId: node.id,
            shift: 1
        });
    };

    const addChild = () => {
        addNewNode({
            parentId: node.id,
            positionId: null,
            tabs: {...node.tabs},
            tools: [{...node.tools[0]}, {...node.tools[1]}]
        })
    };

    const addSibling = () => {
        addNewNode({
            parentId: node.parent,
            positionId: node.id,
            tabs: {...node.tabs},
            tools: [{...node.tools[0]}, {...node.tools[1]}]
        })
    };

    const deleteNodeHandler = () => {
        deleteNode({nodeId: node.id});
    };

    const copyNodeLink = () => {
        const treeId = tree.metadata.treeId;
        let currentUrl = window.location.href;
        currentUrl = currentUrl.split('?')[0];
        const nodeUrl = `${currentUrl}?id=${treeId}&n=${node.id}`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(nodeUrl);
            alert(`Node URL copied to clipboard: ${nodeUrl}`);
        } else {
            alert("Clipboard API not supported in non HTTPS context. Please copy the URL manually." + nodeUrl);
        }
    };

    if (!props.isVisible) return null;

    return (
        <div
            style={{
                position: 'absolute',
                right: '-60px',
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
            {/* Back to Parent */}
            {node.parent && (
                <Tooltip title="Go to Parent" placement="left">
                    <IconButton
                        size="small"
                        onClick={onLeftBtn}
                        sx={{
                            color: theme.palette.primary.main,
                            '&:hover': { backgroundColor: theme.palette.primary.light + '20' }
                        }}
                    >
                        <ArrowBackIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            {/* View Children */}
            {nodeChildren.length > 0 && (
                <Tooltip title={`View Children (${node.data['children_count']} more)`} placement="left">
                    <IconButton
                        size="small"
                        onClick={onRightBtn}
                        sx={{
                            color: theme.palette.primary.main,
                            '&:hover': { backgroundColor: theme.palette.primary.light + '20' }
                        }}
                    >
                        <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}

            {/* Add Child */}
            <Tooltip title="Add Child" placement="left">
                <IconButton
                    size="small"
                    onClick={addChild}
                    sx={{
                        color: theme.palette.success.main,
                        '&:hover': { backgroundColor: theme.palette.success.light + '20' }
                    }}
                >
                    <AddIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            {/* Add Sibling */}
            <Tooltip title="Add Sibling" placement="left">
                <IconButton
                    size="small"
                    onClick={addSibling}
                    sx={{
                        color: theme.palette.success.main,
                        '&:hover': { backgroundColor: theme.palette.success.light + '20' }
                    }}
                >
                    <PersonAddIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            {/* Move Up */}
            <Tooltip title="Move Up" placement="left">
                <IconButton
                    size="small"
                    onClick={moveUp}
                    sx={{
                        color: theme.palette.info.main,
                        '&:hover': { backgroundColor: theme.palette.info.light + '20' }
                    }}
                >
                    <ArrowUpwardIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            {/* Move Down */}
            <Tooltip title="Move Down" placement="left">
                <IconButton
                    size="small"
                    onClick={moveDown}
                    sx={{
                        color: theme.palette.info.main,
                        '&:hover': { backgroundColor: theme.palette.info.light + '20' }
                    }}
                >
                    <ArrowDownwardIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            {/* Copy Link */}
            <Tooltip title="Copy Node Link" placement="left">
                <IconButton
                    size="small"
                    onClick={copyNodeLink}
                    sx={{
                        color: theme.palette.secondary.main,
                        '&:hover': { backgroundColor: theme.palette.secondary.light + '20' }
                    }}
                >
                    <InsertLinkIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            {/* Delete Node */}
            <Tooltip title="Delete Node" placement="left">
                <IconButton
                    size="small"
                    onClick={deleteNodeHandler}
                    disabled={nodeChildren.length > 0 || node.parent === null}
                    sx={{
                        color: theme.palette.error.main,
                        '&:hover': { backgroundColor: theme.palette.error.light + '20' },
                        '&:disabled': { color: theme.palette.action.disabled }
                    }}
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </div>
    );
};