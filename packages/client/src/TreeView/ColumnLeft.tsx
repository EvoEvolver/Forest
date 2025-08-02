import {NavigatorLayer} from "./NavigatorLayer";
import React, {useState} from "react";
import {selectedNodeAtom} from "../TreeState/TreeState";
import {useAtomValue} from "jotai";
import {Box, IconButton} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {useTheme} from "@mui/system";

export function ColumnLeft() {
    const selectedNode = useAtomValue(selectedNodeAtom)
    const [collapsed, setCollapsed] = useState(false);

    if (!selectedNode)
        return null
    const expandedWidth = "100%";
    const collapsedWidth = 40;
    const theme = useTheme();

    return (
        <Box
            sx={{
                position: "relative",
                height: "100%",
                width: expandedWidth,
                overflow: "visible",    // let the button bleed out
            }}
        >
            <Box
                sx={{
                    height: "100%",
                    width: expandedWidth,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                    borderRadius: "10px",
                    boxSizing: "border-box",
                    pt: 1,
                    pb: 1,
                    backgroundColor: theme.palette.background.paper,
                    overflowY: "auto",
                    transform: collapsed ? "scale(0.9) translateX(-20px)" : "scale(1) translateX(0)",
                    opacity: collapsed ? 0 : 1,
                    transition: "all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)",
                }}
            >
                <NavigatorLayer/>
            </Box>

            <IconButton
                disableRipple
                onClick={() => setCollapsed((v) => !v)}
                size="small"
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: collapsed ? collapsedWidth - 1 : expandedWidth,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "50%",
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    zIndex: 10,
                    color: theme.palette.info.main,
                    transition: "all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)",
                    '&:hover': {
                        backgroundColor: theme.palette.info.main + '20',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }
                }}
            >
                {collapsed ? <ChevronRightIcon/> : <ChevronLeftIcon/>}
            </IconButton>
        </Box>
    );
}