import React, {useEffect, useRef, useState} from 'react'
import {Box, Button, CardContent, Stack, TextField, Typography,} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import {BaseMessage} from "./MessageTypes";

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
    const scrollContainerRef = useRef(null);
    const scrollToBottom = () => {
        if (scrollContainerRef.current && endRef.current) {
            const container = scrollContainerRef.current;
            const lastMessage = endRef.current.previousElementSibling;

            if (lastMessage) {
                const containerRect = container.getBoundingClientRect();
                const messageRect = lastMessage.getBoundingClientRect();
                const relativeTop = messageRect.top - containerRect.top + container.scrollTop;

                container.scrollTo({
                    top: relativeTop,
                    behavior: "smooth"
                });
            }
        }
    }

    useEffect(() => {
        return () => {
            endRef.current = null
        }
    }, []);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        setTimeout(() => {
            scrollToBottom();
        }, 10);
    }, [messages]);

    const handleSend = () => {
        if (message.trim()) {
            sendMessage(message);
            setMessage("");
            setTimeout(() => {scrollToBottom()}, 10);
        }
    };

    return (
        <Box
            sx={{
                margin: "0 auto",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                height: "95%",
                position: "relative", // Enable absolute positioning for child elements
                border: '2px solid transparent',
                borderRadius: 2,
                backgroundColor: 'transparent',
                transition: 'all 0.2s ease-in-out',
            }}
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


            <CardContent ref={scrollContainerRef} sx={{flex: 1, overflowY: "auto", pb: 1}}>
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
