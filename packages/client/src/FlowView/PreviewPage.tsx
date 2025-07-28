import {NodeVM} from "@forest/schema";
import {Box, Typography} from "@mui/material";
import React from "react";
import {contentEditableContext} from "@forest/schema/src/viewContext";


// Create a proper React component that can use hooks
export const NodePreview: React.FC<{ node: NodeVM }> = ({node}) => {
    try {
        return <>
            <Typography variant="h6" gutterBottom sx={{color: '#1976d2', mb: 1}}>
                {node.nodeM.title()}
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
