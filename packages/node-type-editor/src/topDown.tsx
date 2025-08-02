import * as React from "react";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import {NodeJson, NodeM, NodeVM} from "@forest/schema";
import {EditorNodeType} from ".";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {useAtomValue} from "jotai";
import {authTokenAtom} from "@forest/user-system/src/authStates";
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import {v4 as uuidv4} from "uuid";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {Card} from "@mui/material";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import AutoAwesomeMotionIcon from '@mui/icons-material/AutoAwesomeMotion';

export const TopDownButton: React.FC<{ node: NodeVM }> = ({node}) => {
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

        const handleAccept = async () => {
            await stageThisVersion(node, "Before top-down child generation");
            const titlesToCreate = Object.entries(selectedTitles)
                .filter(([, checked]) => checked)
                .map(([title]) => title);
            if (titlesToCreate.length > 0) {
                const treeM = node.nodeM.treeM;
                for (const title of titlesToCreate) {
                    const newNodeJson: NodeJson = {
                        id: uuidv4(),
                        title: title,
                        parent: node.id,
                        children: [],
                        data: {},
                        nodeTypeName: "EditorNodeType",
                    };
                    const newNodeM = NodeM.fromNodeJson(newNodeJson, treeM);
                    treeM.insertNode(newNodeM, node.id, null);
                    const editorNodeType = await treeM.supportedNodesTypes("EditorNodeType") as EditorNodeType;
                    editorNodeType.ydataInitialize(newNodeM)
                    editorNodeType.setEditorContent(newNodeM, newChildren.find(child => child.title === title)?.content || "");
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
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <AutoAwesomeMotionIcon color="primary" />
                        <div>
                            <Typography variant="body1" component="div">
                                Split into Children
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                Break large node into smaller nodes
                            </Typography>
                        </div>
                        {loading && <CircularProgress size={20} />}
                    </CardContent>
                </Card>
                <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                    <DialogTitle>Generate New Children</DialogTitle>
                    <DialogContent>
                        <p>Select the new children nodes you want to create:</p>
                        <FormGroup>
                            {newChildren.map(({title, content}) => (
                                <div key={title} style={{marginBottom: 16}}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={selectedTitles[title] ?? true}
                                                onChange={() => handleToggleSelection(title)}
                                            />
                                        }
                                        label={title}
                                    />
                                    <div
                                        style={{marginLeft: 32, color: "#555"}}
                                        dangerouslySetInnerHTML={{__html: content}}
                                    />
                                </div>
                            ))}
                        </FormGroup>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button onClick={handleAccept} color="primary">Accept</Button>
                    </DialogActions>
                </Dialog>
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
    const editorNodeType = await treeM.supportedNodesTypes("EditorNodeType") as EditorNodeType;
    const parentContent = editorNodeType.getEditorContent(node);
    const prompt = `You are a professional editor. Your task is to break a long content into multiple children nodes.
Generate a list of titles for new children nodes that completely cover the original content.

<original_content>
${parentContent}
</original_content>

Please distribute the parent content into multiple new children nodes, each with a unique title.
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

    const response = await fetchChatResponse([message.toJson() as any], "gpt-4.1", authToken);

    try {
        // The response is expected to be a JSON string array
        const titleAndContents = JSON.parse(response);
        return titleAndContents
    } catch (error) {
        console.error("Failed to parse LLM response:", error);
        return [];
    }
}