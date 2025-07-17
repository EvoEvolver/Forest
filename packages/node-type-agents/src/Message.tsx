import React from "react";
import {Box, Card, CardContent, Typography} from '@mui/material';
import {BaseMessage, BaseMessageProps} from "@forest/node-components/src/chat";



export interface ToolCallMessageProps extends BaseMessageProps {
    toolName: string;
    parameters: Record<string, any>;
    result?: any;
}

export class ToolCallMessage extends BaseMessage {
    toolName: string;
    parameters: Record<string, any>;
    result?: any;

    constructor({toolName, parameters, result, ...baseProps}: ToolCallMessageProps) {
        super(baseProps);
        this.toolName = toolName;
        this.parameters = parameters;
        this.result = result;
    }

    render(): React.ReactNode {
        return (
            <Box sx={{display: 'flex', justifyContent: 'flex-start', marginBottom: 2}}>
                <Card sx={{bgcolor: 'white'}}>
                    <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                            Tool Call: {this.toolName}
                        </Typography>
                        <Box component="pre" sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            padding: 1,
                            borderRadius: 1
                        }}>
                            <Typography variant="body2">
                                <b>Input:</b> {JSON.stringify(this.parameters, null, 2)}
                            </Typography>
                        </Box>
                        {this.result && (
                            <Box component="pre" sx={{
                                marginTop: 1,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                padding: 1,
                                borderRadius: 1
                            }}>
                                <Typography variant="body2">
                                    {JSON.stringify(this.result, null, 2)}
                                </Typography>
                            </Box>
                        )}
                        {this.content && <Typography variant="body1" sx={{marginTop: 1}}>{this.content}</Typography>}
                    </CardContent>
                </Card>
            </Box>
        );
    }

    toJson(): object {
        return super.toJson();
    }
}

export interface AgentCallingMessageProps{
    agentName: string;
    message: string;
    author: string
}

export class AgentCallingMessage extends BaseMessage {
    agentName: string;
    message: string;

    constructor({agentName, message, author}: AgentCallingMessageProps) {
        super({content: `Message to ${agentName}: ${message} `, author: author, role: 'assistant', time: ''});
        this.agentName = agentName;
        this.message = message;
    }

    render(): React.ReactNode {
        return (
            <Box sx={{display: 'flex', justifyContent: 'flex-start', marginBottom: 2}}>
                <Card sx={{bgcolor: 'white'}}>
                    <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                            Asking <b>{this.agentName}</b>
                        </Typography>
                        <Box component="pre" sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            padding: 1,
                            borderRadius: 1
                        }}>
                            <Typography variant="body2">
                                <b>Message:</b> {this.message}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    toJson(): object {
        return {
            content: this.content,
            role: this.role,
            time: this.time,
        };
    }
}

export interface AgentResponseMessageProps {
    agentName: string;
    result: string;
    author: string
}

export class AgentResponseMessage extends BaseMessage {
    agentName: string;
    result: string;

    constructor({agentName, result, author}: AgentResponseMessageProps) {
        super({content: `Response from ${agentName}: ${result} `, author: author, role: 'assistant', time: ''});
        this.agentName = agentName;
        this.result = result;
    }

    render(): React.ReactNode {
        return (
            <Box sx={{display: 'flex', justifyContent: 'flex-start', marginBottom: 2}}>
                <Card sx={{bgcolor: 'white'}}>
                    <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                            <b>{this.agentName}:</b>
                        </Typography>
                        <Box component="pre" sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            padding: 1,
                            borderRadius: 1
                        }}>
                            <Typography variant="body2">
                                <b>Response:</b> {this.result}
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        );
    }
}