import React, {useEffect, useRef, useState} from 'react'
import {Box, Button, CardContent, Stack, TextField, Typography, Fade, Chip, CircularProgress} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
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
    loading?: boolean;
}


export function ChatViewImpl({sendMessage, messages, messageDisabled, loading = false}: ChatViewImplProps) {
    const [message, setMessage] = useState("");
    const [showNewMessageReminder, setShowNewMessageReminder] = useState(false);
    const [lastMessageCount, setLastMessageCount] = useState(messages.length);
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

    // Show floating reminder when new messages arrive
    useEffect(() => {
        if (messages.length > lastMessageCount) {
            // New messages detected
            const container = scrollContainerRef.current;
            if (container) {
                const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;

                // Only show reminder if user is not already at the bottom
                if (!isScrolledToBottom) {
                    setShowNewMessageReminder(true);
                }
            }
            setLastMessageCount(messages.length);
        }
    }, [messages, lastMessageCount]);

    // Handle scroll events to hide reminder when user scrolls near bottom
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;
            if (isScrolledToBottom && showNewMessageReminder) {
                setShowNewMessageReminder(false);
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [showNewMessageReminder]);

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
            <CardContent ref={scrollContainerRef} sx={{flex: 1, overflowY: "auto", pb: 1, position: "relative"}}>
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
                    {loading && (
                        <Box display="flex" justifyContent="center" py={2}>
                            <CircularProgress size={24} />
                        </Box>
                    )}
                    <div ref={endRef}/>
                </Stack>

                {/* Floating New Message Reminder */}
                <Fade in={showNewMessageReminder}>
                    <Box
                        sx={{
                            position: "absolute",
                            bottom: 16,
                            left: "50%",
                            transform: "translateX(-50%)",
                            zIndex: 1000,
                        }}
                    >
                        <Chip
                            icon={<KeyboardArrowDownIcon />}
                            label="New message"
                            color="primary"
                            variant="filled"
                            onClick={() => {
                                scrollToBottom();
                                setShowNewMessageReminder(false);
                            }}
                            sx={{
                                cursor: "pointer",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                animation: "pulse 2s infinite",
                                "@keyframes pulse": {
                                    "0%": {
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                                    },
                                    "50%": {
                                        boxShadow: "0 6px 16px rgba(0,0,0,0.25)"
                                    },
                                    "100%": {
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                                    }
                                }
                            }}
                        />
                    </Box>
                </Fade>
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
