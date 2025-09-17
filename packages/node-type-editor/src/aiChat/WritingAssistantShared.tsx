import React, {useState} from "react";
import {NodeM} from "@forest/schema";
import {
    BaseMessage,
    MarkdownMessage,
    NormalMessage,
    SystemMessage
} from "@forest/agent-chat/src/MessageTypes";
import {ChatViewImpl} from "@forest/agent-chat/src/ChatViewImpl";
import {generateText, stepCountIs} from "ai";
import {z} from "zod";
import {getOpenAIInstance} from "@forest/agent-chat/src/llm";
import {OpenAIResponsesProviderOptions} from "@ai-sdk/openai";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SettingsOverscanIcon from '@mui/icons-material/SettingsOverscan';
import CloseIcon from '@mui/icons-material/Close';
import {Typography} from "@mui/material";
import {useTheme} from "@mui/material/styles";
import {WritingMessage} from "./WritingMessage";
import {sanitizeHtmlForEditor} from "./helper";

export interface AIResponse {
    text: string;
    toolResults: any[];
    steps: any[];
}

export interface WritingAssistantConfig {
    systemMessage: string;
    availableNodeIds: string[];
    tools?: Record<string, any>;
    createTools?: (setMessages: React.Dispatch<React.SetStateAction<BaseMessage[]>>) => Record<string, any>;
    showFloatingDialog?: boolean;
}

const contextWindowList = 15;

export const createSuggestModifyTool = (availableNodeIds: string[], treeM: any, setMessages: React.Dispatch<React.SetStateAction<BaseMessage[]>>) => {
    return {
        description: 'Suggest a new version of content for a specific node to the user and the user will receive a prompt to accept or modify it before applying.',
        inputSchema: z.object({
            nodeId: z.string().describe('The ID of the node to create new content for'),
            newContentHTML: z.string().describe('The new HTML content for the node'),
            explanation: z.string().optional().describe('Optional explanation of the changes made')
        }),
        execute: async ({nodeId, newContentHTML, explanation}: {
            nodeId: string;
            newContentHTML: string;
            explanation?: string
        }) => {
            if (!availableNodeIds.includes(nodeId)) {
                throw new Error(`Node ID ${nodeId} is not available. Available IDs: ${availableNodeIds.join(', ')}`);
            }

            const wrappedContent = sanitizeHtmlForEditor(newContentHTML);
            const writingMsg = new WritingMessage({
                content: explanation || "",
                role: "assistant",
                author: "Writing Assistant",
                nodeId: nodeId,
                newContent: wrappedContent,
                treeM: treeM
            });

            setMessages(prevMessages => [...prevMessages, writingMsg]);

            return {success: true};
        },
    } as const;
};

export const formatMessagesForAI = (messages: BaseMessage[], userMessage: string, systemMessage: SystemMessage) => {
    const recentMessages = messages.slice(-contextWindowList);
    const aiMessages = recentMessages.map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content
    }));

    aiMessages.push({
        role: 'user' as const,
        content: userMessage
    });

    return [
        {
            role: 'system' as const,
            content: systemMessage.content
        },
        ...aiMessages
    ];
};

export const useWritingAssistant = (config: WritingAssistantConfig) => {
    const [messages, setMessages] = useState<BaseMessage[]>([]);
    const [disabled, setDisabled] = useState(false);
    const [loading, setLoading] = useState(false);

    const tools = config.createTools ? config.createTools(setMessages) : (config.tools || {});

    const getNextStep = async (userMessage: string): Promise<AIResponse | undefined> => {
        const systemMessage = new SystemMessage(config.systemMessage);
        const messagesWithSystem = formatMessagesForAI(messages, userMessage, systemMessage);
        const openaiModel = getOpenAIInstance();

        try {
            const result = await generateText({
                model: openaiModel('gpt-5'),
                providerOptions: {
                    openai: {
                        reasoningEffort: "minimal"
                    } satisfies OpenAIResponsesProviderOptions,
                },
                messages: messagesWithSystem,
                tools: tools,
                stopWhen: stepCountIs(10)
            });

            return {
                text: result.text,
                toolResults: result.steps.flatMap(step => step.toolResults || []),
                steps: result.steps
            };
        } catch (error) {
            console.error('Error in AI generation:', error);
            throw error;
        }
    };

    const handleSuccessfulResponse = (response: AIResponse) => {
        if (response.text && response.text.trim()) {
            const textMsg = new MarkdownMessage({
                content: response.text.trim(),
                role: "assistant",
                author: "Writing Assistant"
            });
            setMessages(prevMessages => [...prevMessages, textMsg]);
        }
        setDisabled(false);
        setLoading(false);
    };

    const handleError = (error: any, messagesWithUserInput: BaseMessage[]) => {
        console.error('Error from writing agent:', error);
        const result = `Error: ${error.message}`;

        const assistantMsg = new MarkdownMessage({
            content: result,
            role: "assistant",
            author: "Writing Assistant"
        });

        const messagesWithAssistant = [...messagesWithUserInput, assistantMsg];
        setMessages(() => messagesWithAssistant);
        setDisabled(false);
        setLoading(false);
    };

    const sendMessage = async (content: string) => {
        const userMsg = new NormalMessage({
            content: content,
            author: "user",
            role: "user"
        });
        const messagesWithUserInput = [...messages, userMsg];
        setMessages(() => messagesWithUserInput);
        setDisabled(true);
        setLoading(true);

        try {
            const response = await getNextStep(content);
            if (!response) {
                throw new Error("No response received");
            }
            handleSuccessfulResponse(response);
        } catch (error) {
            handleError(error, messagesWithUserInput);
        }
    };

    const resetMessages = () => {
        setMessages([]);
    };

    return {
        messages,
        setMessages,
        disabled,
        loading,
        sendMessage,
        resetMessages
    };
};

export interface WritingAssistantHeaderProps {
    onReset: () => void;
    sendMessage: (content: string) => Promise<void>;
    messages: BaseMessage[];
    messageDisabled: boolean;
    loading: boolean;
}

export const WritingAssistantHeader: React.FC<WritingAssistantHeaderProps> = ({
    onReset,
    sendMessage,
    messages,
    messageDisabled,
    loading
}) => {
    const [isFloatingDialog, setIsFloatingDialog] = useState(false);
    const theme = useTheme();

    return (
        <>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                padding: '8px 0'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '16px',
                    fontWeight: 500
                }}>
                    <AutoAwesomeIcon sx={{ color: theme.palette.primary.main }} />
                    <Typography sx={{ color: theme.palette.text.primary }}>Writing Assistant</Typography>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                        onClick={onReset}
                        variant="outlined"
                        size="small"
                    >
                        Reset
                    </Button>
                    <IconButton
                        onClick={() => setIsFloatingDialog(true)}
                        title="Open in floating dialog"
                        sx={{color: theme.palette.primary.main}}
                    >
                        <SettingsOverscanIcon />
                    </IconButton>
                </div>
            </div>

            {isFloatingDialog&&<Dialog
                open={isFloatingDialog}
                onClose={() => setIsFloatingDialog(false)}
                maxWidth={false}
                PaperProps={{
                    style: {
                        maxWidth: '900px',
                        width: '100%',
                        height: '80vh',
                        maxHeight: '800px',
                        borderRadius: '10px',
                    }
                }}
            >
                <DialogTitle>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '12px',
                        padding: '8px 0'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '16px',
                            fontWeight: 500
                        }}>
                            <AutoAwesomeIcon sx={{ color: theme.palette.primary.main }} />
                            <Typography sx={{ color: theme.palette.text.primary }}>Writing Assistant</Typography>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button
                                onClick={onReset}
                                variant="outlined"
                                size="small"
                            >
                                Reset
                            </Button>
                            <IconButton
                                onClick={() => setIsFloatingDialog(false)}
                                sx={{color: theme.palette.primary.main}}
                            >
                                <CloseIcon />
                            </IconButton>
                        </div>
                    </div>
                </DialogTitle>
                <DialogContent style={{ padding: 0, height: '100%' }}>
                    <div style={{ height: '100%', padding: '0 24px 24px' }}>
                        <ChatViewImpl
                            sendMessage={sendMessage}
                            messages={messages || []}
                            messageDisabled={messageDisabled}
                            loading={loading}
                        />
                    </div>
                </DialogContent>
            </Dialog>}
        </>
    );
};