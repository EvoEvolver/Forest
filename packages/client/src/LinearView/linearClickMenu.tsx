// Click menu component for LinearView nodes
import {NodeM} from "@forest/schema";
import {useTheme} from "@mui/system";
import {useSetAtom} from "jotai/index";
import {currentPageAtom} from "../appState";
import {jumpToNodeAtom, scrollToNodeAtom} from "../TreeState/TreeState";
import {IconButton, Tooltip} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import EditIcon from "@mui/icons-material/Edit";
import LaunchIcon from "@mui/icons-material/Launch";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import React from "react";

export const LinearClickMenu = ({node, isVisible, isEditing, onToggleEdit, position}: {
    node: NodeM,
    isVisible: boolean,
    isEditing: boolean,
    onToggleEdit: () => void,
    position: { x: number, y: number } | null
}) => {
    const theme = useTheme();
    const setCurrentPage = useSetAtom(currentPageAtom);
    const jumpToNode = useSetAtom(jumpToNodeAtom);
    const scrollToNode = useSetAtom(scrollToNodeAtom);

    const goToNodeInTreeView = () => {
        setCurrentPage("tree");
        setTimeout(() => {
            jumpToNode(node.id);
            setTimeout(() => {
                scrollToNode(node.id);
            }, 100);
        }, 300);
    };


    if (!isVisible || !position) return null;

    // Menu dimensions (approximate)
    const menuWidth = 48;
    const menuHeight = 80;

    // Calculate menu position with edge detection
    let left = position.x + 10;
    let top = position.y;

    // Prevent menu from going off the right edge
    if (left + menuWidth > window.innerWidth) {
        left = position.x - menuWidth - 10;
    }

    // Prevent menu from going off the bottom edge
    if (top + menuHeight > window.innerHeight) {
        top = position.y - menuHeight;
    }

    // Ensure menu doesn't go off the left or top edge
    left = Math.max(10, left);
    top = Math.max(10, top);

    const menuStyle = {
        position: 'fixed' as const,
        left,
        top,
        backgroundColor: theme.palette.background.paper,
        borderRadius: '8px',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        border: `1px solid ${theme.palette.divider}`,
        zIndex: 1000,
        minWidth: '40px'
    };

    return (
        <div style={menuStyle}>
            <Tooltip title="Focus on section" placement="right">
                <IconButton
                    size="small"
                    onClick={() => {
                        jumpToNode(node.id)
                    }}
                    sx={{
                        color: theme.palette.primary.main,
                        '&:hover': {backgroundColor: theme.palette.action.hover}
                    }}
                >
                    <ZoomInIcon fontSize="small"/>
                </IconButton>
            </Tooltip>
            <Tooltip title="Go to node in editor view" placement="right">
                <IconButton
                    size="small"
                    onClick={goToNodeInTreeView}
                    sx={{
                        color: theme.palette.primary.main,
                        '&:hover': {backgroundColor: theme.palette.action.hover}
                    }}
                >
                    <LaunchIcon fontSize="small"/>
                </IconButton>
            </Tooltip>
            <Tooltip title={isEditing ? "Save changes" : "Edit node content"} placement="right">
                <IconButton
                    size="small"
                    onClick={onToggleEdit}
                    sx={{
                        color: theme.palette.primary.main,
                        '&:hover': {backgroundColor: theme.palette.action.hover}
                    }}
                >
                    {isEditing ? <CheckIcon fontSize="small"/> : <EditIcon fontSize="small"/>}
                </IconButton>
            </Tooltip>
        </div>
    );
};