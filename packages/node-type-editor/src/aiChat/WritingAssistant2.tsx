import React from "react";
import {useEffect, useRef, useCallback} from "react";
import {NodeM} from "@forest/schema";
import {ChatViewImpl} from "@forest/agent-chat/src/ChatViewImpl";
import {EditorNodeTypeM} from "..";
import {extractExportContent} from "../editor/Extensions/exportHelpers";
import {useWritingAssistant, createSuggestModifyTool, WritingAssistantHeader} from "./WritingAssistantShared";
import {SystemMessage} from "@forest/agent-chat/src/MessageTypes";
import {createSuggestNewTitleTool} from "./WritingAssistantTools";

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

Terminology:
- <div class="export">...</div> means the content that directly are shown in the final document, while other contents are notes for the author only.

Task instructions:
- When the user asks for adding paragraphs or adding exports, you should append a <div class="export">...</div> block at the end of the content and generate the paragraphs inside it. The paragraph should be ready for being shown in the final document.
- If the user asks for modifying the content and there are more than 10 nodes could be modified, you should ask the user where to modify first.
- If you don't have enough tool to complete the task, you should inform the user about it.

You must:
- If the user asks for writing something, by default, it means that you need to call suggestModify tool.
- If the user did not specify which node to modify, you should assume the user wants to modify all the nodes.
- Don't drop the links in the content. Put every <a></a> link in a proper place with proper content.
- Don't expand an abbreviation by yourself.

Keep in mind:
- Always use tools to suggest changes. Never just write your suggestions in the text response.
- You should modify prioriting modifying terminal nodes first.

Respond naturally and conversationally. You can include regular text explanations along with any new content versions using the tool. Focus on being helpful and collaborative in your writing assistance.
`);
};

export function WritingAssistant2({contextNodes}: WritingAssistant2Props) {
    const contextStringRef = useRef<string | null>(null);
    const lastContextNodesRef = useRef<ContextNode[]>([]);

    // Lazy context string getter
    const getContextString = useCallback(() => {
        // Check if context nodes have changed
        const nodesChanged = contextNodes !== lastContextNodesRef.current ||
            contextNodes.length !== lastContextNodesRef.current.length ||
            contextNodes.some((node, i) => node !== lastContextNodesRef.current[i]);

        if (nodesChanged || contextStringRef.current === null) {
            contextStringRef.current = buildContextString(contextNodes);
            lastContextNodesRef.current = contextNodes;
        }

        return contextStringRef.current;
    }, [contextNodes]);

    const availableNodeIds = contextNodes.map(cn => cn.node.id);
    const treeM = contextNodes.length > 0 ? contextNodes[0].node.treeM : null;

    // Only build system message when needed (lazy evaluation)
    const getSystemMessageContent = useCallback(() => {
        return getSystemMessage(getContextString(), contextNodes).content;
    }, [getContextString, contextNodes]);

    const {
        messages,
        setMessages,
        disabled,
        loading,
        sendMessage,
        resetMessages
    } = useWritingAssistant({
        systemMessage: getSystemMessageContent(),
        availableNodeIds,
        createTools: treeM ? (setMessagesParam) => ({
            suggestModify: createSuggestModifyTool(availableNodeIds, treeM, setMessagesParam),
            suggestNewTitle: createSuggestNewTitleTool(availableNodeIds, treeM, setMessagesParam),
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