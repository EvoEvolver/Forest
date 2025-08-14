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
import SyncIcon from '@mui/icons-material/Sync';
import {ModifyConfirmation} from "./ModifyConfirmation";
import pRetry from 'p-retry';

export const TopDownMatchingButton: React.FC<{ node: NodeVM }> = ({node}) => {
        const [loading, setLoading] = React.useState(false);
        const [currentChildIndex, setCurrentChildIndex] = React.useState(-1);
        const [updatedChildren, setUpdatedChildren] = React.useState<TitleAndContent[]>([]);
        const [originalChildren, setOriginalChildren] = React.useState<TitleAndContent[]>([]);
        const authToken = useAtomValue(authTokenAtom)

        const handleClick = async () => {
            setLoading(true);
            try {
                const treeM = node.nodeM.treeM;
                const childrenNodes = treeM.getChildren(node.nodeM).filter((n) => n.nodeTypeName() === "EditorNodeType" && n.data()["archived"] !== true);
                const originalChildrenData = childrenNodes.map(child => ({
                    title: child.title(),
                    content: EditorNodeTypeM.getEditorContent(child)
                }));
                
                const titleAndContents = await getTopDownMatchingChildren(node.nodeM, authToken);
                
                if (titleAndContents.length === 0) {
                    alert("No updates needed. Children are already consistent with the parent.");
                    return;
                }
                
                setOriginalChildren(originalChildrenData);
                setUpdatedChildren(titleAndContents);
                setCurrentChildIndex(0);
            } finally {
                setLoading(false);
            }
        };

        const handleCloseDialog = () => {
            setCurrentChildIndex(-1);
            setUpdatedChildren([]);
            setOriginalChildren([]);
        };

        const handleAccept = async (modifiedContent: string) => {
            await stageThisVersion(node, "Before top-down matching update");
            
            if (currentChildIndex >= 0 && currentChildIndex < updatedChildren.length) {
                const currentChild = updatedChildren[currentChildIndex];
                const treeM = node.nodeM.treeM;
                const childrenNodes = treeM.getChildren(node.nodeM).filter((n) => n.nodeTypeName() === "EditorNodeType" && n.data()["archived"] !== true);
                const childNode = childrenNodes.find(child => child.title() === currentChild.title);
                
                if (childNode) {
                    try {
                        EditorNodeTypeM.setEditorContent(childNode, modifiedContent);
                    } catch (e) {
                        alert(e)
                    }
                }
            }
            
            if (currentChildIndex < updatedChildren.length - 1) {
                setCurrentChildIndex(currentChildIndex + 1);
            } else {
                handleCloseDialog();
            }
        };

        const handleSkip = () => {
            if (currentChildIndex < updatedChildren.length - 1) {
                setCurrentChildIndex(currentChildIndex + 1);
            } else {
                handleCloseDialog();
            }
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
                        <SyncIcon color="primary"/>
                        <div>
                            <Typography variant="body1" component="div">
                                Match Children to Parent
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Update children to match latest parent version
                            </Typography>
                        </div>
                        {loading && <CircularProgress size={20}/>}
                    </CardContent>
                </Card>
{currentChildIndex >= 0 && currentChildIndex < updatedChildren.length && (
                    <ModifyConfirmation
                        open={true}
                        onClose={handleCloseDialog}
                        onAccept={handleAccept}
                        dialogTitle={`Update Child ${currentChildIndex + 1} of ${updatedChildren.length}: ${updatedChildren[currentChildIndex].title}`}
                        comparisonContent={{
                            original: {
                                title: "Current Version",
                                content: originalChildren.find(child => child.title === updatedChildren[currentChildIndex].title)?.content || ""
                            },
                            modified: {
                                title: "Suggested Changes", 
                                content: updatedChildren[currentChildIndex].content
                            }
                        }}
                    />
                )}
            </>
        );
    }
;

interface TitleAndContent {
    title: string;
    content: string;
}

async function getTopDownMatchingChildren(node: NodeM, authToken: string): Promise<TitleAndContent[]> {
    const treeM = node.treeM;
    const parentContent = EditorNodeTypeM.getEditorContent(node);
    const childrenNodes = treeM.getChildren(node).filter((n) => n.nodeTypeName() === "EditorNodeType" && n.data()["archived"] !== true);
    
    const childrenContent = childrenNodes.map(child => ({
        title: child.title(),
        content: EditorNodeTypeM.getEditorContent(child)
    }));

    const prompt = `
You are a professional editor. Your task is to update children nodes ONLY when there are factual differences with their parent node.

IMPORTANT: Be conservative. DO NOT make unnecessary changes. Only modify children when there are actual factual inconsistencies or outdated information compared to the parent.

<parent_content>
${parentContent}
</parent_content>

<current_children>
${childrenContent.map(child => `<child title="${child.title}">
${child.content}
</child>`).join('\n\n')}
</current_children>

Please analyze the parent content and current children, then ONLY suggest updates when:
- There are factual inconsistencies between parent and child
- Information in the child is outdated compared to the parent
- Critical information from the parent is missing in the child

DO NOT change:
- Writing style or tone
- Extra information not present in the parent
- Structure unless absolutely necessary
- Formatting preferences
- Minor wording differences that don't affect meaning

<output_format>
If NO changes are needed for a children, return an empty string "" as its content

If changes are needed, return a JSON array of JSON objects with the following format.
Only include children that have actual factual differences requiring updates.
[
    {"title": <The existing child title>, "content": <Updated HTML content for the child node>},
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
            if (response.trim() === '""' || response.trim() === '') {
                return [];
            }

            const titleAndContents = JSON.parse(response);

            const filteredContents = titleAndContents.filter(child => child.content && child.content.trim() !== "");
            
            for (const child of filteredContents) {
                const isValid = EditorNodeTypeM.validateEditorContent(child.content);
                if (!isValid) {
                    throw new Error(`Child content validation failed for title: ${child.title}`);
                }
            }

            return filteredContents;
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