import * as React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import DownloadIcon from '@mui/icons-material/Download';
import {NodeM, NodeVM} from "@forest/schema";
import {EditorNodeTypeM} from "..";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import {NormalMessage} from "\@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {ModifyConfirmation} from "./ModifyConfirmation";

export const ParentToSummaryButton: React.FC<{ node: NodeVM }> = ({node}) => {
    const [loading, setLoading] = React.useState(false);
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [parentContent, setParentContent] = React.useState<string | null>(null);
    const [summaryContent, setSummaryContent] = React.useState<string | null>(null);
    const authToken = useAtomValue(authTokenAtom)

    const handleClick = async () => {
        setLoading(true);
        try {
            const treeM = node.nodeM.treeM;
            const parent = treeM.getParent(node.nodeM);

            const parentContentText = parent && parent.nodeTypeName() === "EditorNodeType"
                ? EditorNodeTypeM.getEditorContent(parent)
                : "No suitable parent node found.";

            const summary = await getParentBasedSummary(node.nodeM, authToken);

            setParentContent(parentContentText);
            setSummaryContent(summary);
            setDialogOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setParentContent(null);
        setSummaryContent(null);
    };

    const handleAccept = async (modifiedContent: string) => {
        await stageThisVersion(node.nodeM, "Before parent-to-summary editing");
        try {
            EditorNodeTypeM.setEditorContent(node.nodeM, modifiedContent);
        }catch (e){
            alert(e)
        }
        handleCloseDialog();
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
                    <DownloadIcon color="primary"/>
                    <div>
                        <Typography variant="body1" component="div">
                            Write paragraph from parent
                        </Typography>
                    </div>
                    {loading && <CircularProgress size={20}/>}
                </CardContent>
            </Card>
            <ModifyConfirmation
                open={dialogOpen}
                onClose={handleCloseDialog}
                onAccept={handleAccept}
                dialogTitle="Review Summary"
                comparisonContent={{
                    original: {
                        title: "Parent Node Content",
                        content: parentContent ?? ""
                    },
                    modified: {
                        title: "Paragraph generated",
                        content: summaryContent ?? ""
                    }
                }}
            />
        </>
    );
};

async function getParentBasedSummary(node: NodeM, authToken: string): Promise<string> {
    const treeM = node.treeM;
    const parent = treeM.getParent(node);

    if (!parent || parent.nodeTypeName() !== "EditorNodeType") {
        return "No suitable parent node found to generate summary from.";
    }

    const parentContent = EditorNodeTypeM.getEditorContent(parent);
    const currentContent = EditorNodeTypeM.getEditorContent(node);

    const prompt = `You are a professional writer. Your task is to write a paragraph based on the parent node's content.

<parent_content>
${parentContent}
</parent_content>

<current_content>
${currentContent}
</current_content>

Please write a paragraph for the parent content. The paragraph should:
- If the current content is not empty and is relavent to the parent content, rewrite with similar style and include the current content.
- Never add new content not present in the parent content. Just rephrase the existing content.
- You have to mention all the information in the parent content.
- Be written in a clear, professional style

<output_format>
You should only return the HTML content of the paragraph without any additional text or formatting.
You should keep the links in the original content and put them in a proper place.
</output_format>
`;

    const message = new NormalMessage(
        {
            content: prompt,
            author: "user",
            role: "user",

        }
    )
    return await fetchChatResponse([message.toJson() as any], "gpt-4.1", authToken);
}