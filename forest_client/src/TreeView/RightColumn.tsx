import { NavigatorLayer } from "./NavigatorLayer";
import React, { useState } from "react";
import { Box, IconButton, Collapse } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export function RightColumn() {
    const [collapsed, setCollapsed] = useState(false);
    const expandedWidth = 300;
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
                marginLeft: "24px",
                flexShrink: 0,
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
                    right: collapsed ? 0 : -20,
                    transform: "translateY(-50%)",
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

