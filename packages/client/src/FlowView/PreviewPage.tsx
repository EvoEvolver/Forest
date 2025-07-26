import {NodeVM} from "@forest/schema";
import {Box, IconButton, Typography} from "@mui/material";
import React from "react";
import {contentEditableContext} from "@forest/schema/src/viewContext";
import {useSetAtom} from "jotai";
import {jumpToNodeAtom, scrollToNodeAtom} from "../TreeState/TreeState";
import {currentPageAtom} from "../appState";
import EditDocumentIcon from '@mui/icons-material/EditDocument';


// Create a proper React component that can use hooks
export const NodePreview: React.FC<{ node: NodeVM }> = ({ node }) => {
    const setCurrentPage = useSetAtom(currentPageAtom);
    const jumpToNode = useSetAtom(jumpToNodeAtom);
    const scrollToNode = useSetAtom(scrollToNodeAtom)

    const goToNodeInTreeView = () => {
        setCurrentPage("tree");
        setTimeout(() => {
            jumpToNode(node.id);
            setTimeout(() => {
                scrollToNode(node.id);
            }, 100)
        }, 300);

    };

    try {
        return <>
            <Typography variant="h6" gutterBottom sx={{color: '#1976d2', mb: 1}}>
                {node.nodeM.title()} <Box sx={{float: 'right'}}>
                <IconButton size="small" onClick={goToNodeInTreeView}>
                    <EditDocumentIcon fontSize="small"/>
                </IconButton>
            </Box>
            </Typography>

            <Box sx={{maxHeight: 400, overflow: 'auto'}}>
                <contentEditableContext.Provider value={false}>
                    {node.nodeType.render(node)}
                </contentEditableContext.Provider>
            </Box>
        </>
    } catch (error) {
        return <Typography color="error">Error rendering node
            content: {error?.message || 'Unknown error'}</Typography>;
    }
};
