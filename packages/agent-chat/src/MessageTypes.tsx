import React from 'react'
import {Box, Card, CardContent, Chip, Tooltip, Typography,} from "@mui/material";
import {useAtomValue, useSetAtom} from "jotai/index";
import {jumpToNodeAtom, scrollToNodeAtom, treeAtom} from "@forest/client/src/TreeState/TreeState";
import {treeId} from "@forest/client/src/appState";

// @ts-ignore
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL

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


function GoToNode({index, nodeId}: { index: number, nodeId: string }) {
    const jumpToNode = useSetAtom(jumpToNodeAtom)
    const scrollToNode = useSetAtom(scrollToNodeAtom)
    const tree = useAtomValue(treeAtom)
    const getTitle = (id: string): string => {
        return tree.treeM.getNode(id).title()
    }
    const handleClick = () => {
        jumpToNode(nodeId)
        setTimeout(() => {
            scrollToNode(nodeId)
        }, 100)
    }
    return (
        <Tooltip title={getTitle(nodeId) || "(Untitled)"}>
            <Chip sx={{marginInline: "3px"}} onClick={handleClick} variant="filled" size="small" color="primary"
                  label={index}/>
        </Tooltip>
    );
}

export class HtmlMessage extends BaseMessage {
    constructor(props: BaseMessageProps) {
        super(props);
    }

    render(): React.ReactNode {
        const parseHtmlContent = (html: string): React.ReactNode => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            let nodeLinkIndex = 0;
            const processNode = (node: Node): React.ReactNode => {
                if (node.nodeType === Node.TEXT_NODE) {
                    return node.textContent;
                }

                if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = node as Element;

                    if (element.tagName === 'A') {
                        const href = element.getAttribute('href');
                        if (href && (href.includes(FRONTEND_URL) || href.includes('localhost:29999') || href.includes('localhost:39999'))) {
                            const url = new URL(href);
                            const linkTreeId = url.searchParams.get('id');
                            const nodeId = url.searchParams.get('n');
                            if (nodeId && linkTreeId === treeId) {
                                nodeLinkIndex++;
                                return <GoToNode index={nodeLinkIndex} key={nodeId} nodeId={nodeId}/>;
                            }
                        }
                    }

                    const children = Array.from(element.childNodes).map((child) =>
                        processNode(child)
                    );

                    return React.createElement(
                        element.tagName.toLowerCase(),
                        {key: Math.random()},
                        ...children
                    );
                }

                return null;
            };

            return Array.from(doc.body.childNodes).map((node, index) =>
                React.createElement(React.Fragment, {key: index}, processNode(node))
            );
        };

        return (
            <Box sx={{display: 'flex', marginBottom: 2}}>
                <Card sx={{}}>
                    <CardContent>
                        {parseHtmlContent(this.content)}
                    </CardContent>
                </Card>
            </Box>
        );
    }
}

export class MarkdownMessage extends BaseMessage {
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