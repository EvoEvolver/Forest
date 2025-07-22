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
                    backgroundColor: "#ffffff",
                    color: "black",
                    overflowY: "auto",
                    transform: collapsed ? "scale(0.9) translateX(-20px)" : "scale(1) translateX(0)",
                    opacity: collapsed ? 0 : 1,
                    transition: "all 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)",
                }}
            >
                <NavigatorLayer />
            </Box>

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