import React, {useEffect, useRef, useState} from 'react'
import {Box, Button, Card, CardContent, Paper, Stack, TextField, Typography,} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import {BaseMessage} from "./MessageTypes";
import {useDragContext} from "../../client/src/TreeView/DragContext";

// Types for Messages
export interface Message {
    content: string;
    role: "assistant" | "user";
    author: string;
}

// Props for ChatViewImpl component
interface ChatViewImplProps {
    sendMessage: (content: string) => Promise<void>;
    messages: BaseMessage[];
    messageDisabled: boolean;
}


export function ChatViewImpl({sendMessage, messages, messageDisabled}: ChatViewImplProps) {
    const [message, setMessage] = useState("");
    const endRef = useRef(null);
    const [username,] = useState("user");
    const { setIsDraggingOverChat, draggedNodeId } = useDragContext();

    useEffect(() => {
        endRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages]);

    useEffect(() => {
        return () => {
            endRef.current = null
        }
    }, []);

    const handleSend = () => {
        if (message.trim()) {
            sendMessage(message);
            setMessage("");
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDraggingOverChat(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Only set to false if we're actually leaving the chat area
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDraggingOverChat(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        console.log("DragDropToChat")
        e.preventDefault();
        setIsDraggingOverChat(false);
        
        const draggedNodeId = e.dataTransfer.getData('nodeId');
        if (draggedNodeId) {
            // Insert the node ID into the text field
            const nodeIdText = `{nodeId: ${draggedNodeId}}`;
            setMessage((prev: string) => prev + nodeIdText);
        }
    };

    return (
        <Box
            sx={{
                margin: "0 auto",
                padding: 2,
                display: "flex",
                flexDirection: "column",
                height: "95%",
                position: "relative", // Enable absolute positioning for child elements
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Settings Icon */}
            <Box
                sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    cursor: "pointer",
                }}
            >
            </Box>


            <CardContent sx={{flex: 1, overflowY: "auto", pb: 1}}>
                <Stack spacing={1}>
                    {messages.map((msg, idx) => (
                        <Box
                            key={idx}
                            display="flex"
                        >
                            <Box>
                                {msg.author && (
                                    <Typography
                                        variant="caption"
                                        color="black"
                                        sx={{display: "block", marginBottom: 0.5}}
                                    >
                                        {msg.author}
                                    </Typography>
                                )}
                                {msg.render()}
                            </Box>
                        </Box>
                    ))}
                    <div ref={endRef}/>
                </Stack>
            </CardContent>
            <Box display="flex" gap={1} mt={1}>
                <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            if (e.shiftKey) {
                                return;
                            }
                            if (!messageDisabled) {
                                e.preventDefault();
                                handleSend();
                            }
                        }
                    }}
                    autoComplete="off"
                    disabled={messageDisabled}
                    multiline
                />
                <Button
                    variant="contained"
                    onClick={handleSend}
                    disabled={messageDisabled}
                >
                    <SendIcon/>
                </Button>
            </Box>
        </Box>
    );
}
