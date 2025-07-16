import React, { useState } from "react";
import { useAtomValue } from "jotai";
import { selectedNodeAtom } from "../TreeState/TreeState";
import { NodeContentTabs } from "./NodeContentTab";
import { NodeContentFrame } from "./NodeContentFrame";
import { Box, IconButton, Collapse } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export function LeftColumn() {
    const node = useAtomValue(selectedNodeAtom);
    const [collapsed, setCollapsed] = useState(false);
    const expandedWidth = 400;
    const collapsedWidth = 40;

    return (
        <Box
            sx={{
                position: "relative",
                height: "calc(100% - 96px)",
                width: collapsed ? collapsedWidth : expandedWidth,
                transition: "width 0.3s ease",
                overflow: "visible",
                marginTop: "48px",
                marginRight: "24px",
                flexShrink: 0,
            }}
        >
            <Collapse
                in={!collapsed}
                orientation="horizontal"
                timeout={300}
                unmountOnExit
                component={Box}
                sx={{ height: "100%" }}
            >
                <Box
                    sx={{
                        height: "100%",
                        width: expandedWidth,
                        display: "flex",
                        flexDirection: "column",
                        gap: "24px",
                        padding: "0 4px 24px 0",
                        boxSizing: "border-box",
                    }}
                >
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <NodeContentFrame>
                            <NodeContentTabs node={node} tabDict={node.tools[0]} titleAtom="" />
                        </NodeContentFrame>
                    </Box>
                    <Box sx={{ flex: 1, minHeight: 0 }}>
                        <NodeContentFrame>
                            <NodeContentTabs node={node} tabDict={node.tools[1]} titleAtom="" />
                        </NodeContentFrame>
                    </Box>
                </Box>
            </Collapse>

            <IconButton
                disableRipple
                onClick={() => setCollapsed((v) => !v)}
                size="small"
                sx={{
                    position: "absolute",
                    top: "50%",
                    left: collapsed ? 0 : -20,
                    transform: "translateY(-50%)",
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    zIndex: 10,
                    "&:hover": { backgroundColor: "#fff", opacity: 1 },
                }}
            >
                {collapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
        </Box>
    );
}