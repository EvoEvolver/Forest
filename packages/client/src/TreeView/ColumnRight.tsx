import React, {useState} from "react";
import {useAtomValue} from "jotai";
import {selectedNodeAtom} from "../TreeState/TreeState";
import {thisNodeContext} from "./NodeContext";
import {NodeContentFrame} from "./NodeContentFrame";
import IssueList from "@forest/issue-tracker/src/components/IssueList/IssueList";
import {Box, Paper, ToggleButton, ToggleButtonGroup} from '@mui/material';
import {useTheme} from '@mui/system';
import BuildIcon from '@mui/icons-material/Build';
import DescriptionIcon from '@mui/icons-material/Description';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import {CursorChat} from "@forest/agent-chat/src/CursorChat";

type TabType = 'tools' | 'issues' | 'assistant';

export function ColumnRight() {
    const node = useAtomValue(selectedNodeAtom);
    const [activeTab, setActiveTab] = useState<TabType>('tools');

    if (!node)
        return null;

    const theme = useTheme();

    const handleTabChange = (event: React.MouseEvent<HTMLElement>, newTab: TabType | null) => {
        if (newTab !== null) {
            setActiveTab(newTab);
        }
    };

    return <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 1,
        gap: 2,
    }}>
        <Paper elevation={1} sx={{p: 1}}>
            <ToggleButtonGroup
                value={activeTab}
                exclusive
                onChange={handleTabChange}
                aria-label="tab selection"
                size="small"
                fullWidth
                sx={{
                    '& .MuiToggleButton-root': {
                        border: 'none',
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        gap: 1,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textTransform: 'none',
                        color: theme.palette.text.secondary,
                        '&.Mui-selected': {
                            backgroundColor: theme.palette.primary.main,
                            color: theme.palette.primary.contrastText,
                            '&:hover': {
                                backgroundColor: theme.palette.primary.dark,
                            }
                        },
                        '&:hover': {
                            backgroundColor: theme.palette.action.hover,
                        }
                    }
                }}
            >
                <ToggleButton value="tools" aria-label="tools">
                    <BuildIcon fontSize="small"/>
                    Tools
                </ToggleButton>
                <ToggleButton value="issues" aria-label="issues">
                    <DescriptionIcon fontSize="small"/>
                    Issues
                </ToggleButton>
                <ToggleButton value="assistant" aria-label="assistant">
                    <SmartToyIcon fontSize="small"/>
                    Assistant
                </ToggleButton>
            </ToggleButtonGroup>
        </Paper>

        {activeTab === 'tools' && (
            <thisNodeContext.Provider value={node}>
                <Box sx={{flex: 1, minHeight: 0}}>
                    <NodeContentFrame>
                        {node.nodeType.renderTool1(node)}
                    </NodeContentFrame>
                </Box>
                <Box sx={{flex: 1, minHeight: 0}}>
                    <NodeContentFrame>
                        {node.nodeType.renderTool2(node)}
                    </NodeContentFrame>
                </Box>
            </thisNodeContext.Provider>
        )}
        {activeTab === 'issues' && (
            <Box sx={{flex: 1, overflow: 'hidden'}}>
                <IssueList simple={true} treeId={node.treeVM.treeM.id()} nodeId={node.id}/>
            </Box>
        )}
        {activeTab === 'assistant' && (
            <Box sx={{flex: 1, overflow: 'hidden'}}>
                <CursorChat selectedNode={node}></CursorChat>
            </Box>
        )}
    </Box>;
}