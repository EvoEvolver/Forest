import React, {useContext, useEffect, useRef, useState} from 'react'
import {Array as YArray} from 'yjs'
import {Box, Button, Card, CardContent, Paper, Stack, TextField, Typography,} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsPanel from "./setting";
import {useAtom} from "jotai";
import {atomWithStorage} from 'jotai/utils'
import {thisNodeContext} from "../../NodeContentTab";

interface ChatViewProps {
  label?: string; // The ? makes it optional
}

export default function ChatView({label}: ChatViewProps) {
    const node = useContext(thisNodeContext);

    let chatLabel = label || "";

    let yMessages = node.ydata.get("yMessages"+chatLabel);
    if (!yMessages) {
        yMessages = new YArray();
        node.ydata.set("yMessages", yMessages);
    }
    const [messages, setMessages] = useState(yMessages.toArray())


    useEffect(() => {
        const updateMessages = () => setMessages(yMessages.toArray())
        yMessages.observe(updateMessages)
        return () => yMessages.unobserve(updateMessages)
    }, [])

    const sendMessage = ({content, author, time}) => {
        yMessages.push([{content: content, author: author, time: time}])
    }

    return <>
        <ChatViewImpl sendMessage={sendMessage} messages={messages} messageDisabled={false}/>
    </>
}


export const usernameAtom = atomWithStorage('chat-username', '');

export function ChatViewImpl({sendMessage, messages,messageDisabled}) {
    const [message, setMessage] = useState("");
    const endRef = useRef(null);
    const [settingPanelOpen, setSettingPanelOpen] = useState(false)
    const [username, setUsername] = useAtom(usernameAtom);

    useEffect(() => {
        endRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages]);


    useEffect(() => {
        if (username === "") {
            let defaultUsername = `User${Math.floor(Math.random() * 1000)}`;
            setUsername(defaultUsername); // Default username
        }
        return () => {
            endRef.current = null
        }
    }, []);

    const handleSend = () => {
        if (message.trim()) {
            sendMessage({
                content: message,
                author: username,
                time: Date.now()
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
                height: "100%",
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
                <Box
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        cursor: "pointer",
                    }}
                    onClick={() => setSettingPanelOpen(true)} // Toggle SettingsPanel on click
                >
                    <SettingsIcon/>
                </Box>
            </Box>

            {/* Conditionally render SettingsPanel */}
            {settingPanelOpen &&
                <SettingsPanel closePanel={() => setSettingPanelOpen(false)}/>}

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
