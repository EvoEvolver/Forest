import React from 'react'
import {Box, Card, CardContent, Typography,} from "@mui/material";


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