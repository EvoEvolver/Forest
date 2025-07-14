import React, {useEffect, useRef, useState} from 'react'
import {Box, Button, Card, CardContent, Paper, Stack, TextField, Typography,} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';

// Types for Messages
export interface Message {
    content: string;
    htmlContent?: string;
    role: "assistant" | "user";
    author: string;
    time: string;
}

// Props for ChatViewImpl component
interface ChatViewImplProps {
    sendMessage: (message: Message) => Promise<void>;
    messages: Message[];
    messageDisabled: boolean;
}


export function ChatViewImpl({sendMessage, messages, messageDisabled}: ChatViewImplProps) {
    const [message, setMessage] = useState("");
    const endRef = useRef(null);
    const [username,] = useState("user")

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
            sendMessage({
                content: message,
                author: username,
                role: "user",
                time: Date.now().toString()
            });
            setMessage("");
        }
    };

    return (
        <Card
            elevation={3}
            sx={{
                maxWidth: 600,
                margin: "0 auto",
                padding: 2,
                display: "flex",
                flexDirection: "column",
                height: "95%",
                maxHeight: "500px",
                position: "relative", // Enable absolute positioning for child elements
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


            <CardContent sx={{flex: 1, overflowY: "auto", pb: 1}}>
                <Stack spacing={1}>
                    {messages.map((msg, idx) => (
                        <Box
                            key={idx}
                            display="flex"
                            justifyContent={
                                msg.author === username ? "flex-end" : "flex-start"
                            }
                        >
                            <Paper
                                elevation={1}
                                sx={{
                                    padding: 1.5,
                                    borderRadius: 2,
                                    backgroundColor:
                                        msg.author === username ? "#d6ebff" : "#f0f0f0",
                                    color: msg.author === username ? "#000000" : "#000000",
                                    maxWidth: "75%",
                                }}
                            >
                                {msg.author && (
                                    <Typography
                                        variant="caption"
                                        color="textSecondary"
                                        sx={{display: "block", marginBottom: 0.5}}
                                    >
                                        {msg.author}
                                    </Typography>
                                )}
                                <Typography variant="body2">{msg.content}</Typography>
                            </Paper>
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
        </Card>
    );
}
