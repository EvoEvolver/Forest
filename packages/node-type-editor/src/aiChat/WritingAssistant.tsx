import React, {useEffect} from "react";
import {NodeM, NodeVM} from "@forest/schema";
import {useAtomValue} from "jotai";
import {markedNodesAtom} from "@forest/client/src/TreeState/TreeState";
import {EditorNodeTypeM} from "..";
import {ChatViewImpl} from "@forest/agent-chat/src/ChatViewImpl";
import {useWritingAssistant, createSuggestModifyTool, WritingAssistantHeader} from "./WritingAssistantShared";
import {createLoadNodeContentTool, createSuggestNewTitleTool, createSuggestNewNodeTool, createGetChildrenListTool} from "./WritingAssistantTools";
import {SystemMessage} from "@forest/agent-chat/src/MessageTypes";

interface ContextualContent {
    originalContent: string;
    parentContent: string;
    markedNodeContent: string;
    childrenInfo: string;
    siblingsInfo: string;
    parent: NodeM | null;
    markedNodesList: NodeM[];
    childrenList: NodeM[];
    siblingsList: NodeM[];
}


const getAvailableNodeIds = (contextualContent: ContextualContent, currentNodeId: string): string[] => {
    const {parent, markedNodesList, childrenList, siblingsList} = contextualContent;
    const availableNodeIds = [currentNodeId];

    if (parent && parent.nodeTypeName() === "EditorNodeType") {
        availableNodeIds.push(parent.id);
    }
    availableNodeIds.push(...markedNodesList.map(n => n.id));
    availableNodeIds.push(...childrenList.map(n => n.id));
    availableNodeIds.push(...siblingsList.map(n => n.id));

    return availableNodeIds;
};

const buildAvailableNodeIdsString = (contextualContent: ContextualContent, nodeM: NodeM): string => {
    const {parent, markedNodesList, childrenList, siblingsList} = contextualContent;

    let result = `- Current node (${nodeM.title()}): ${nodeM.id}`;

    if (parent && parent.nodeTypeName() === "EditorNodeType") {
        result += `\n- Parent node (${parent.title()}): ${parent.id}`;
    }
    if (markedNodesList.length > 0) {
        result += `\n- Marked nodes:\n${markedNodesList.map(n => `  - ${n.title()}: ${n.id}`).join('\n')}`;
    }
    if (childrenList.length > 0) {
        result += `\n- Children nodes:\n${childrenList.map(n => `  - ${n.title()}: ${n.id}`).join('\n')}`;
    }
    if (siblingsList.length > 0) {
        result += `\n- Sibling nodes:\n${siblingsList.map(n => `  - ${n.title()}: ${n.id}`).join('\n')}`;
    }

    return result;
};


const getContextualContent = (nodeM: NodeM, markedNodes: Set<string>): ContextualContent => {
    const treeM = nodeM.treeM;
    const originalContent = EditorNodeTypeM.getEditorContent(nodeM);

    const parent = treeM.getParent(nodeM);
    const parentContent = parent && parent.nodeTypeName() === "EditorNodeType"
        ? `<parentContent id="${parent.id}">\n` + EditorNodeTypeM.getEditorContent(parent) + "\n</parentContent>"
        : "";

    let markedNodeContent = ""
    let markedNodesList = Array.from(markedNodes).map(id => treeM.getNode(id)).filter(n => n && n.nodeTypeName() === "EditorNodeType") as NodeM[]
    if (markedNodesList.length > 0) {
        markedNodeContent = "<markedNodes>\n" + markedNodesList.map(child => `Title:${child.title()} (ID: ${child.id})\n` + EditorNodeTypeM.getEditorContent(child)).join("\n-----\n") + "\n</markedNodes>";
    }

    let childrenInfo = "";
    let childrenList: NodeM[] = [];
    childrenList = treeM.getChildren(nodeM).filter((n: NodeM) => n && n.nodeTypeName() === "EditorNodeType") as NodeM[];
    if (childrenList.length > 0) {
        childrenInfo = "<childrenNodes>\n" + childrenList.map(child => `Title: ${child.title()} (ID: ${child.id})`).join("\n") + "\n</childrenNodes>";
    }

    let siblingsInfo = "";
    let siblingsList: NodeM[] = [];
    if (parent) {
        siblingsList = treeM.getChildren(parent).filter((n: NodeM) => n && n.nodeTypeName() === "EditorNodeType" && n.id !== nodeM.id) as NodeM[];
        if (siblingsList.length > 0) {
            siblingsInfo = "<siblingNodes>\n" + siblingsList.map(sibling => `Title: ${sibling.title()} (ID: ${sibling.id})`).join("\n") + "\n</siblingNodes>";
        }
    }

    return {
        originalContent,
        parentContent,
        markedNodeContent,
        childrenInfo,
        siblingsInfo,
        parent,
        markedNodesList,
        childrenList,
        siblingsList
    };
};
const getSystemMessage = (nodeM: NodeM, markedNodes): SystemMessage => {
    const contextualContent = getContextualContent(nodeM, markedNodes);
    const {originalContent, parentContent, markedNodeContent, childrenInfo, siblingsInfo} = contextualContent;
    const availableNodeIds = buildAvailableNodeIdsString(contextualContent, nodeM);

    return new SystemMessage(`
You are a professional writing assistant AI agent that helps user write on a tree structure documents, where each node is a unit of content.

Your context is the following:
<context>
Currently, the user select node (ID: ${nodeM.id}):
<currentContent>
${originalContent}
</currentContent>

${parentContent}

${markedNodeContent}

${childrenInfo}

${siblingsInfo}
</context>

You are here to help the user with writing tasks including:
- Improving and refining existing content
- Providing writing suggestions and feedback
- Generating new content based on user requests
- Answering questions about the current content

Terminology:
- A "node" refers to a single unit of content in the tree structure.
- A "level" refers to all the siblings of the node and the node itself.

Logic of tree structure:
- The parent node should be a summary of all its children nodes by default.
- The children nodes should be more detailed and specific than the parent node.
- Bullet points are preferred for any nodes unless the user specifies otherwise.
- The <div> with class "export" is a special container that contains the content generated from other content in that node. It should be considered as a part of the node.

Task instructions:
- "Matching children": you should check whether the current children nodes reflects the content in the current node. If not, you should suggest modifying the children nodes to match the content in the current node.

You must 
- You must use tool loadNodeContent to get the content of a node first before writing about them.
- If the user asks for writing something, by default, it means that you need to call suggestModify tool to write the content for the current node.
- Don't drop the links in the content. Put every <a></a> link in a proper place with proper content.
- Don't expand an abbreviation by yourself.
- If the user specifies another node, you can also call suggestModify tool to write for that node.
- You don't need to mention what new version you created in your text response, as the user will see the new version directly.

Keep in mind:
- Always use tools to suggest changes. Never just write your suggestions in the text response.

Available node IDs you can create new versions for:
${availableNodeIds}

You can create new versions for any of these nodes - the current node, parent node, marked nodes, children nodes, or sibling nodes. This allows you to suggest improvements to related content beyond just the current node.

Respond naturally and conversationally. You can include regular text explanations along with any new content versions using the tool. Focus on being helpful and collaborative in your writing assistance.
`);
};

export function WritingAssistant({selectedNode}: { selectedNode: NodeVM }) {
    const node = selectedNode;
    const markedNodes = useAtomValue(markedNodesAtom);

    const {
        messages,
        setMessages,
        disabled,
        loading,
        sendMessage,
        resetMessages
    } = useWritingAssistant({
        getSystemMessage: () => getSystemMessage(node.nodeM, markedNodes).content,
        createTools: (setMessagesParam) => ({
            suggestModify: createSuggestModifyTool(node.nodeM.treeM, setMessagesParam),
            loadNodeContent: createLoadNodeContentTool(node.nodeM.treeM, setMessagesParam),
            suggestNewTitle: createSuggestNewTitleTool(node.nodeM.treeM, setMessagesParam),
            suggestNewNode: createSuggestNewNodeTool(node.nodeM.treeM, setMessagesParam),
            getChildrenList: createGetChildrenListTool(node.nodeM.treeM, setMessagesParam)
        })
    });

    useEffect(() => {
        // Reset messages when selected node changes
        // setMessages([]);
    }, [selectedNode.nodeM.id]);

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


