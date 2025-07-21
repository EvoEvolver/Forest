import {NavigatorButtons, NavigatorLayer} from "./NavigatorLayer";
import React, {useState} from "react";
import {selectedNodeAtom} from "../TreeState/TreeState";
import {useAtomValue} from "jotai";
import {NodeContentFrame} from "./NodeContentFrame";
import {Box, Collapse, IconButton} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export function ColumnLeft() {
    const selectedNode = useAtomValue(selectedNodeAtom)
    if (!selectedNode)
        return null

    const [collapsed, setCollapsed] = useState(false);
    const expandedWidth = 300;
    const collapsedWidth = 40;

    return (
        <Box
            sx={{
                position: "relative",
                height: "100%",
                width: collapsed ? collapsedWidth : expandedWidth,
                transition: "all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)",
                overflow: "visible",    // let the button bleed out
            }}
        >
            <Collapse
                in={!collapsed}
                orientation="horizontal"
                timeout={400}
                unmountOnExit
                component={Box}            // makes it a Box so we can pass sx
                sx={{ 
                    height: "100%",
                    '& .MuiCollapse-wrapperInner': {
                        width: expandedWidth,
                    }
                }}    // <-- force full height
            >
                <Box
                    sx={{
                        height: "100%",
                        width: expandedWidth,
                        border: "1px solid #c6c6c6",
                        borderRadius: "16px",
                        boxSizing: "border-box",
                        pt: 1,
                        pb: 1,
                        backgroundColor: "#fafafa",
                        color: "black",
                        overflowY: "auto",
                        transform: collapsed ? "scale(0.95)" : "scale(1)",
                        opacity: collapsed ? 0 : 1,
                        transition: "all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)",
                    }}
                >
                    <NavigatorLayer />
                </Box>
            </Collapse>

            <IconButton
                disableRipple
                onClick={() => setCollapsed((v) => !v)}
                size="small"
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: collapsed ? collapsedWidth - 1 : expandedWidth - 1,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "#fff",
                    border: "1px solid #c6c6c6",
                    borderRadius: "50%",
                    zIndex: 10,
                    transition: "all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)",
                    background: "linear-gradient(145deg, #ffffff, #f0f0f0)",
                    "&:hover": { 
                        backgroundColor: "#fff",
                        transform: "translate(-50%, -50%) scale(1.1)"
                    },
                }}
            >
                {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
        </Box>
    );
}