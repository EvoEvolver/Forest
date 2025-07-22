import React, {useEffect, useRef, useState} from 'react'
import {Box, Button, Card, CardContent, Paper, Stack, TextField, Typography,} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';


export type MessageRole = "user" | "assistant" | "system"

export interface BaseMessageProps {
    content: string;
    author: string;
    role: MessageRole;
    time: string;
}

export abstract class BaseMessage {
    content: string;
    author: string;
    role: MessageRole;
    time: string;

    constructor({content, author, role, time}: BaseMessageProps) {
        this.content = content;
        this.author = author;
        this.role = role;
        this.time = time;
    }

    abstract render(): React.ReactNode

    toJson(): object {
        return {
            content: this.content,
            role: this.role,
        };
    }
}

export class NormalMessage extends BaseMessage {
    constructor(props: BaseMessageProps) {
        super(props);
    }
    render(): React.ReactNode {
        return (
            <Box sx={{display: 'flex', marginBottom: 2}}>
                <Card sx={{}}>
                    <CardContent>
                        <Typography variant="body1">{this.content}</Typography>
                    </CardContent>
                </Card>
            </Box>
        );
    }
}

export class SystemMessage extends BaseMessage {
    constructor(content: string) {
        super({content, author: "", role: "system", time: new Date().toISOString()});
    }
    render(): React.ReactNode {
        return undefined;
    }
}

// Types for Messages
export interface Message {
    content: string;
    role: "assistant" | "user";
    author: string;
}

// Props for ChatViewImpl component
interface ChatViewImplProps {
    sendMessage: (message: { content: string; author: string; role: string; }) => Promise<void>;
    messages: BaseMessage[];
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
                role: "user"
            });
            setMessage("");
        }
    };

    return (
        <Card
            elevation={3}
            sx={{
                margin: "0 auto",
                padding: 2,
                display: "flex",
                flexDirection: "column",
                height: "95%",
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
        </Card>
    );
}
