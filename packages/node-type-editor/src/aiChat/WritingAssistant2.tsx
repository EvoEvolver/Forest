import React from "react";
import {useEffect, useMemo} from "react";
import {NodeM} from "@forest/schema";
import {ChatViewImpl} from "@forest/agent-chat/src/ChatViewImpl";
import {EditorNodeTypeM} from "..";
import {extractExportContent} from "../editor/Extensions/exportHelpers";
import {useWritingAssistant, createSuggestModifyTool, WritingAssistantHeader} from "./WritingAssistantShared";
import {SystemMessage} from "@forest/agent-chat/src/MessageTypes";

interface ContextNode {
    node: NodeM;
    level: number;
}

interface WritingAssistant2Props {
    contextNodes: ContextNode[];
}


const buildContextString = (contextNodes: ContextNode[]): string => {
    let contextString = "";

    if (contextNodes.length > 0) {
        contextString += "Context nodes:\n";
        contextNodes.forEach(contextNode => {
            const {node, level} = contextNode;
            const fullContent = EditorNodeTypeM.getEditorContent(node);
            const treeM = node.treeM;
            const children = treeM.getChildren(node);
            const isTerminal = children.length === 0;

            let contentToShow = '';

            if (isTerminal) {
                // Terminal node: always show full content
                contentToShow = fullContent
            } else {
                // Non-terminal node: show full content only if export content exists
                const exportContent = extractExportContent(fullContent);
                if (exportContent.trim()) {
                    contentToShow = fullContent;
                }
            }

            if (contentToShow.trim()) {
                contextString += `$<contextNode id="${node.id}" title="${node.title()}" level="${level}">\n${contentToShow}\n</contextNode>\n\n`;
            }
            else {
                contextString += `<headerNode title="${node.title()}" level="${level}" />\n\n`;
            }
        });
    }

    return contextString;
};

const getSystemMessage = (contextString: string, contextNodes: ContextNode[]): SystemMessage => {
    const availableNodeIds = contextNodes.map(cn => `- ${cn.node.title()}: ${cn.node.id}`).join('\n');

    return new SystemMessage(`
You are a professional writing assistant AI agent that helps users write on a document/section, where each node is a unit of content.

The user is facing the followings nodes from the document:
<context>
${contextString}
</context>

You are here to help the user with writing tasks including:
- Improving and refining existing content
- Providing writing suggestions and feedback
- Generating new content based on user requests
- Answering questions about the current content

You must:
- If the user asks for writing something, by default, it means that you need to call suggestModify tool to write the content for the specified node.
- Don't drop the links in the content. Put every <a></a> link in a proper place with proper content.
- Don't expand an abbreviation by yourself.

Keep in mind:
- Always use tools to suggest changes. Never just write your suggestions in the text response.
- You should modify prioriting modifying terminal nodes first.

Available node IDs you can create new versions for:
${availableNodeIds}

Respond naturally and conversationally. You can include regular text explanations along with any new content versions using the tool. Focus on being helpful and collaborative in your writing assistance.
`);
};

const contextWindowList = 12;


export function WritingAssistant2({contextNodes}: WritingAssistant2Props) {
    // Memoize the expensive context string building
    const contextString = useMemo(() => {
        return buildContextString(contextNodes);
    }, [contextNodes]);

    const availableNodeIds = contextNodes.map(cn => cn.node.id);
    const treeM = contextNodes.length > 0 ? contextNodes[0].node.treeM : null;

    const systemMessage = getSystemMessage(contextString, contextNodes).content;

    const {
        messages,
        setMessages,
        disabled,
        loading,
        sendMessage,
        resetMessages
    } = useWritingAssistant({
        systemMessage,
        availableNodeIds,
        createTools: treeM ? (setMessagesParam) => ({
            suggestModify: createSuggestModifyTool(availableNodeIds, treeM, setMessagesParam)
        }) : undefined
    });

    useEffect(() => {
        // Reset messages when context nodes change
        // setMessages([]);
    }, [contextNodes]);


    return <div style={{height: '100%', margin: "0"}}>
        <WritingAssistantHeader
            onReset={resetMessages}
            sendMessage={sendMessage}
            messages={messages}
            messageDisabled={disabled}
            loading={loading}
        />
        <div style={{width: '100%', height: '95%'}}>
            <ChatViewImpl
                sendMessage={sendMessage}
                messages={messages}
                messageDisabled={disabled}
                loading={loading}
            />
        </div>
    </div>
}