import React, {useEffect, useRef, useState} from 'react'
import {Array as YArray} from 'yjs'
import {Node} from "../../../entities";
import {Box, Button, Card, CardContent, Paper, Stack, TextField, Typography,} from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsPanel from "./setting";
import {YjsProviderAtom} from "../../../TreeState/YjsConnection";
import {atom, useAtom, useSetAtom} from "jotai";
import {useAtomValue} from "jotai/index";


export default function ChatView(props: { node: Node }) {
    const node = props.node
    //const provider = useAtomValue(YjsProviderAtom)
    let yMessages = node.ydata.get("yMessages");
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
        <ChatViewImpl sendMessage={sendMessage} messages={messages}/>
    </>
}


export const usernameAtom = atom()
export const setUsernameAtom = atom(null, (get, set, newUsername: string) => {
    set(usernameAtom, newUsername);
    localStorage.setItem('username', newUsername);
});

function ChatViewImpl({sendMessage, messages}) {
    const [message, setMessage] = useState("");
    const endRef = useRef(null);
    const [settingPanelOpen, setSettingPanelOpen] = useState(false)
    const username= useAtomValue(usernameAtom);
    const setUsername = useSetAtom(setUsernameAtom);

    useEffect(() => {
        endRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages]);


    useEffect(() => {
        if (!username) {
            const storedUsername = localStorage.getItem('username');
            if (storedUsername) {
                setUsername(storedUsername);
            } else {
                let defaultUsername = `User${Math.floor(Math.random() * 1000)}`;
                setUsername(defaultUsername); // Default username
            }
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
                height: 500,
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
            {settingPanelOpen && <SettingsPanel closePanel={() => setSettingPanelOpen(false)} setUsername={setUsername}/>}

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
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    autoComplete="off"
                />
                <Button variant="contained" onClick={handleSend}>
                    <SendIcon/>
                </Button>
            </Box>
        </Card>
    );
}
