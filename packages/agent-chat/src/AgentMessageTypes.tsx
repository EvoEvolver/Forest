import React from "react";
import {Box, Card, CardContent, Typography} from '@mui/material';
import {BaseMessage} from "./MessageTypes"
import * as showdown from 'showdown';

export interface AgentCallingMessageProps {
    agentName: string;
    message: string;
    author: string
}

export class AgentCallingMessage extends BaseMessage {
    agentName: string;
    message: string;

    constructor({agentName, message, author}: AgentCallingMessageProps) {
        super({content: `Message to ${agentName}: ${message} `, author: author, role: 'assistant'});
        this.agentName = agentName;
        this.message = message;
    }

    render(): React.ReactNode {
        return (
            <Box sx={{display: 'flex', justifyContent: 'flex-start', marginBottom: 2}}>
                <Card>
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
            role: this.role
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
        super({content: `You got response from ${agentName}: ${result} `, author: author, role: 'user'});
        this.agentName = agentName;
        this.result = result;
    }

    toJson(): object {
        return super.toJson();
    }

    render(): React.ReactNode {
        const converter = new showdown.Converter();
        const resultHtml = converter.makeHtml(this.result);

        return (
            <Box sx={{display: 'flex', justifyContent: 'flex-start', marginBottom: 2}}>
                <Card>
                    <CardContent>
                        <Box component="div" sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            padding: 1,
                            borderRadius: 1,
                            '& img': {
                                maxWidth: '100%',
                                height: 'auto',
                                borderRadius: 1,
                                display: 'block',
                                margin: '8px 0'
                            },
                            '& p': {
                                margin: '8px 0',
                                lineHeight: 1.5
                            },
                            '& h1, & h2, & h3, & h4, & h5, & h6': {
                                margin: '16px 0 8px 0'
                            }
                        }}>
                            <Typography variant="body2" component="div">
                                <span dangerouslySetInnerHTML={{__html: resultHtml}}/>
                            </Typography>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        );
    }
}

interface ToolCallingMessageProps {
    toolName: string;
    parameters: any;
    author: string;
}

export class ToolCallingMessage extends BaseMessage {
    toolName: string;
    parameters: Record<string, any>;

    constructor({toolName, parameters, author}: ToolCallingMessageProps) {
        super({content: `Calling Tool ${toolName} with parameters ${parameters}`, author, role: 'assistant'});
        this.toolName = toolName;
        this.parameters = parameters;
    }

    render(): React.ReactNode {
        return (
            <Box sx={{display: 'flex', justifyContent: 'flex-start', marginBottom: 2}}>
                <Card>
                    <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                            Tool Call: <b>{this.toolName}</b>
                        </Typography>
                        <Box component="pre" sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            padding: 1,
                            borderRadius: 1,
                            marginTop: 1
                        }}>
                            <Typography variant="body2">
                                <b>Parameters:</b> {JSON.stringify(this.parameters, null, 2)}
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
            role: this.role
        };
    }
}

interface ToolResponseMessageProps {
    toolName: string;
    response: any;
    author: string;
}

export class ToolResponseMessage extends BaseMessage {
    toolName: string;
    response: any;

    constructor({toolName, response, author}: ToolResponseMessageProps) {
        super({
            content: `You got response from tool ${toolName}. The response is ${JSON.stringify(response)}`,
            author,
            role: 'assistant'
        });
        this.toolName = toolName;
        this.response = response;
    }

    render(): React.ReactNode {
        return (
            <Box sx={{display: 'flex', justifyContent: 'flex-start', marginBottom: 2}}>
                <Card>
                    <CardContent>
                        <Typography variant="subtitle2" gutterBottom>
                            Tool Response: <b>{this.toolName}</b>
                        </Typography>
                        <Box component="pre" sx={{
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            padding: 1,
                            borderRadius: 1,
                            marginTop: 1
                        }}>
                            <Typography variant="body2">
                                <b>Response:</b> {JSON.stringify(this.response, null, 2)}
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
            role: this.role
        };
    }
}