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
                transition: "width 0.3s ease",
                overflow: "visible",    // let the button bleed out
            }}
        >
            <Collapse
                in={!collapsed}
                orientation="horizontal"
                timeout={300}
                unmountOnExit
                component={Box}            // makes it a Box so we can pass sx
                sx={{ height: "100%" }}    // <-- force full height
            >
                <Box
                    sx={{
                        height: "100%",
                        width: expandedWidth,
                        boxShadow: "0px 0px 20px rgba(0,0,0,0.1)",
                        border: "1px solid #c6c6c6",
                        borderRadius: "10px",
                        boxSizing: "border-box",
                        pt: 1,
                        pb: 1,
                        backgroundColor: "#fafafa",
                        color: "black",
                        overflowY: "auto",
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
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    zIndex: 10,
                    "&:hover": { backgroundColor: "#fff", opacity: 1 },
                }}
            >
                {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
        </Box>
    );
}