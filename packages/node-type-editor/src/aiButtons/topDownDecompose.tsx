import * as React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import {NodeM, NodeVM} from "@forest/schema";
import {EditorNodeTypeM} from "..";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {Card} from "@mui/material";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';
import {SelectionConfirmation} from "./SelectionConfirmation";
import pRetry from 'p-retry';

export const TopDownDecomposeButton: React.FC<{ node: NodeVM }> = ({node}) => {
        const [loading, setLoading] = React.useState(false);
        const [dialogOpen, setDialogOpen] = React.useState(false);
        const [newChildren, setNewChildren] = React.useState<string[]>([]);
        const [selectedTitles, setSelectedTitles] = React.useState<Record<string, boolean>>({});
        const authToken = useAtomValue(authTokenAtom)

        const handleClick = async () => {
            setLoading(true);
            try {
                const titleAndContents = await getTopDownNewChildren(node.nodeM, authToken);
                setNewChildren(titleAndContents);
                setSelectedTitles(
                    titleAndContents.reduce(
                        (acc, child) => ({...acc, [child.title]: true}),
                        {}
                    )
                );
                setDialogOpen(true);
            } finally {
                setLoading(false);
            }
        };

        const handleCloseDialog = () => {
            setDialogOpen(false);
            setNewChildren([]);
            setSelectedTitles({});
        };

        const handleAccept = async (modifiedItems: { id: string; title: string; content: string }[]) => {
            await stageThisVersion(node, "Before top-down child generation");
            const itemsToCreate = modifiedItems.filter(item => selectedTitles[item.id]);
            if (itemsToCreate.length > 0) {
                const treeM = node.nodeM.treeM;
                for (const item of itemsToCreate) {
                    const newNodeM = NodeM.newNode(item.title, node.id, "EditorNodeType", treeM);
                    treeM.insertNode(newNodeM, node.id, null);
                    try {
                        EditorNodeTypeM.setEditorContent(newNodeM, item.content);
                    } catch (e) {
                        alert(e)
                    }
                }
            }
            handleCloseDialog();
        };

        const handleToggleSelection = (title: string) => {
            setSelectedTitles(prev => ({...prev, [title]: !prev[title]}));
        };

        return (
            <>
                <Card
                    sx={{
                        cursor: 'pointer',
                        boxShadow: 3,
                        '&:hover': {
                            boxShadow: 6,
                            transform: 'translateY(-2px)'
                        },
                        transition: 'all 0.2s ease-in-out',
                        margin: "10px 0",
                        borderRadius: "10px"
                    }}
                    onClick={handleClick}
                >
                    <CardContent sx={{display: 'flex', alignItems: 'center', gap: 2}}>
                        <AutoAwesomeMotionIcon color="primary"/>
                        <div>
                            <Typography variant="body1" component="div">
                                Split into Children
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Break large node into smaller nodes
                            </Typography>
                        </div>
                        {loading && <CircularProgress size={20}/>}
                    </CardContent>
                </Card>
                <SelectionConfirmation
                    open={dialogOpen}
                    onClose={handleCloseDialog}
                    onAccept={handleAccept}
                    dialogTitle="Generate New Children"
                    selectionItems={newChildren.map(({title, content}) => ({
                        id: title,
                        title,
                        content
                    }))}
                    selectedItems={selectedTitles}
                    onToggleSelection={handleToggleSelection}
                />
            </>
        );
    }
;

interface TitleAndContent {
    title: string;
    content: string;
}

async function getTopDownNewChildren(node: NodeM, authToken: string): Promise<TitleAndContent[]> {
    const treeM = node.treeM;
    const parentContent = EditorNodeTypeM.getEditorContent(node);
    const prompt = `
You are a professional editor. Your task is to break a long content into multiple children nodes.
Generate a list of titles for new children nodes that completely cover the original content.

<original_content>
${parentContent}
</original_content>

Please distribute the parent content into multiple new children nodes, each with a unique title.
If there is any existing sectioning logic in the original content, please respect them.
The titles should be concise and descriptive.
You should add at most 5 new children nodes. Therefore, you should first analyze where the break the original content.
<output_format>
You should only return a JSON array of JSON objects with the following format.
There should be at most 5 objects in the array.
You should not put any HTML elements not appearing in the original content.
[
    {"title": <A concise and descriptive title>, "content": <HTML content for the new child node 1>},
    ...
]
</output_format>
`;

    const message = new NormalMessage({
        content: prompt,
        author: "user",
        role: "user"
    });

    return await pRetry(async () => {
        const response = await fetchChatResponse([message.toJson() as any], "gpt-4.1", authToken);

        try {
            // The response is expected to be a JSON string array
            const titleAndContents = JSON.parse(response);

            // Validate each child content
            for (const child of titleAndContents) {
                if (!child.content) continue;
                const isValid = EditorNodeTypeM.validateEditorContent(child.content);
                if (!isValid) {
                    throw new Error(`Child content validation failed for title: ${child.title}`);
                }
            }

            return titleAndContents;
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error("Failed to parse LLM response as JSON");
            }
            throw error;
        }
    }, {
        retries: 3,
        onFailedAttempt: (error) => {
            console.warn(`Validation failed on attempt ${error.attemptNumber}:`, error.message);
        }
    });
}