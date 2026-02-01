import React from "react";
import {useEffect, useRef, useCallback, useState} from "react";
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
    const lastContextNodesRef = useRef<string>('');
    const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const pendingMessageRef = useRef<string | null>(null);

    // Lazy context string getter
    const getContextString = useCallback(() => {
        // Create a stable key from context nodes to detect changes
        const contextKey = contextNodes.map(cn => `${cn.node.id}-${cn.level}`).join('|');

        if (contextKey !== lastContextNodesRef.current || contextStringRef.current === null) {
            contextStringRef.current = buildContextString(contextNodes);
            lastContextNodesRef.current = contextKey;
        }

        return contextStringRef.current;
    }, [contextNodes]);

    const treeM = contextNodes.length > 0 ? contextNodes[0].node.treeM : null;

    // Only build system message when needed (lazy evaluation)
    const getSystemMessageContent = useCallback(() => {
        const contextString = getContextString();
        const availableNodeIds = contextNodes.map(cn => cn.node.id);
        const systemMessageContent = getSystemMessage(contextString, contextNodes).content;

        // Add available node IDs to the system message
        const availableNodeIdsString = availableNodeIds.length > 0
            ? `\n\nAvailable node IDs you can create new versions for:\n${availableNodeIds.map(id => `- ${id}`).join('\n')}\n\nYou can create new versions for any of these nodes. This allows you to suggest improvements to the content.`
            : '';

        return systemMessageContent + availableNodeIdsString;
    }, [getContextString, contextNodes]);

    const {
        messages,
        disabled,
        loading,
        sendMessage,
        resetMessages
    } = useWritingAssistant({
        getSystemMessage: getSystemMessageContent,
        createTools: treeM ? (setMessagesParam) => ({
            suggestModify: createSuggestModifyTool(treeM, setMessagesParam),
            suggestNewTitle: createSuggestNewTitleTool(treeM, setMessagesParam),
        }) : undefined
    });

    // Wrapper to check API key before sending message
    const sendMessageWithApiKeyCheck = useCallback((message: string) => {
        const apiKey = localStorage.getItem('openaiApiKey');
        if (!apiKey) {
            pendingMessageRef.current = message;
            setShowApiKeyDialog(true);
            return;
        }
        sendMessage(message);
    }, [sendMessage]);

    // Handle API key submission
    const handleApiKeySubmit = useCallback(() => {
        if (apiKeyInput.trim()) {
            localStorage.setItem('openaiApiKey', apiKeyInput.trim());
            setShowApiKeyDialog(false);

            // Send pending message if there is one
            if (pendingMessageRef.current) {
                sendMessage(pendingMessageRef.current);
                pendingMessageRef.current = null;
            }

            setApiKeyInput('');
        }
    }, [apiKeyInput, sendMessage]);

    // Handle dialog cancel
    const handleApiKeyCancel = useCallback(() => {
        setShowApiKeyDialog(false);
        setApiKeyInput('');
        pendingMessageRef.current = null;
    }, []);

    useEffect(() => {
        // Clear cached context string when context nodes change
        contextStringRef.current = null;
        lastContextNodesRef.current = '';
    }, [contextNodes]);


    return <div style={{height: '100%', margin: "0"}}>
        <WritingAssistantHeader
            onReset={resetMessages}
            sendMessage={sendMessageWithApiKeyCheck}
            messages={messages}
            messageDisabled={disabled}
            loading={loading}
        />
        <div style={{width: '100%', height: '95%'}}>
            <ChatViewImpl
                sendMessage={sendMessageWithApiKeyCheck}
                messages={messages}
                messageDisabled={disabled}
                loading={loading}
            />
        </div>

        {/* API Key Dialog */}
        {showApiKeyDialog && (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '8px',
                    minWidth: '400px',
                    maxWidth: '500px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                    <h3 style={{marginTop: 0, marginBottom: '16px'}}>OpenAI API Key Required</h3>
                    <p style={{marginBottom: '16px', color: '#666'}}>
                        Please enter your OpenAI API key to use the writing assistant.
                    </p>
                    <input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleApiKeySubmit();
                            }
                        }}
                        placeholder="sk-..."
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            marginBottom: '16px',
                            boxSizing: 'border-box'
                        }}
                        autoFocus
                    />
                    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
                        <button
                            onClick={handleApiKeyCancel}
                            style={{
                                padding: '8px 16px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApiKeySubmit}
                            disabled={!apiKeyInput.trim()}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '4px',
                                backgroundColor: apiKeyInput.trim() ? '#007bff' : '#ccc',
                                color: 'white',
                                cursor: apiKeyInput.trim() ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
}