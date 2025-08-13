import {EditorNodeTypeM} from "@forest/node-type-editor"
import {ReaderNodeTypeM} from "@forest/node-type-reader"
import {EmbeddedNodeTypeM} from "@forest/node-type-embedded"
import {CustomNodeTypeM} from "@forest/node-components"
import {A2ANodeTypeM} from "@forest/node-type-agents/src/A2ANode"
import {AgentNodeTypeM} from "@forest/node-type-agents/src/AgentNode"
import {AgentToolNodeTypeM} from "@forest/node-type-agents/src/ToolNode"
import {CodeInterpreterNodeTypeM} from "@forest/node-type-agents/src/CodeInterpreterNode"
import {KnowledgeNodeTypeM} from "@forest/node-type-agents/src/KnowledgeNode"
import {MCPNodeTypeM} from "@forest/node-type-agents/src/MCPNode"
import {MongoDataGridNodeTypeM} from "@forest/node-type-mongo-datagrid"
import {NodeTypeM} from "@forest/schema/src/nodeTypeM";

const typeInstances = {
    "CustomNodeType": CustomNodeTypeM,
    "AgentNodeType": AgentNodeTypeM,
    "AgentToolNodeType": AgentToolNodeTypeM,
    "MCPNodeType": MCPNodeTypeM,
    "A2ANodeType": A2ANodeTypeM,
    "CodeInterpreterNodeType": CodeInterpreterNodeTypeM,
    "KnowledgeNodeType": KnowledgeNodeTypeM,
    "MongoDataGridNodeType": MongoDataGridNodeTypeM,
    "EditorNodeType": EditorNodeTypeM,
    "ReaderNodeType": ReaderNodeTypeM,
    "EmbeddedNodeType": EmbeddedNodeTypeM,
};

export const supportedNodeTypesM = (typeName: string): typeof NodeTypeM | null => {
    if (typeName in typeInstances) {
        return typeInstances[typeName];
    }
    return null;
}