import {EditorNodeTypeVM} from "@forest/node-type-editor"
import {ReaderNodeTypeVM} from "@forest/node-type-reader"
import {CustomNodeTypeVM} from "@forest/node-components"
import {A2ANodeTypeVM} from "@forest/node-type-agents/src/A2ANodeTypeVM"
import {AgentNodeTypeVM} from "@forest/node-type-agents/src/AgentNode"
import {AgentToolNodeTypeVM} from "@forest/node-type-agents/src/ToolNode"
import {CodeInterpreterNodeTypeVM} from "@forest/node-type-agents/src/CodeInterpreterNode"
import {KnowledgeNodeTypeVM} from "@forest/node-type-agents/src/KnowledgeNode"
import {MCPNodeTypeVM} from "@forest/node-type-agents/src/MCPNodeTypeVM"

import {MongoDataGridNodeTypeVM} from "@forest/node-type-mongo-datagrid"
import {NodeTypeVM} from "@forest/schema/src/nodeTypeVM";

const typeInstances = {
    "CustomNodeType": CustomNodeTypeVM,
    "AgentNodeType": AgentNodeTypeVM,
    "AgentToolNodeType": AgentToolNodeTypeVM,
    "MCPNodeType": MCPNodeTypeVM,
    "A2ANodeType": A2ANodeTypeVM,
    "CodeInterpreterNodeType": CodeInterpreterNodeTypeVM,
    "KnowledgeNodeType": KnowledgeNodeTypeVM,
    "MongoDataGridNodeType": MongoDataGridNodeTypeVM,
    "EditorNodeType": EditorNodeTypeVM,
    "ReaderNodeType": ReaderNodeTypeVM,
};

export const supportedNodeTypesVM = (typeName: string): typeof NodeTypeVM | null => {
    if (typeName in typeInstances) {
        return typeInstances[typeName];
    }
    return null;
}