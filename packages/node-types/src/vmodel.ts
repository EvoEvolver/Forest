import {EditorNodeTypeVM} from "@forest/node-type-editor"
import {ReaderNodeTypeVM} from "@forest/node-type-reader"
import {SupportedNodeTypesVM} from "@forest/schema/src/viewModel";

// @ts-ignore
const typeModules = {
    "CustomNodeType": () => import("@forest/node-components").then(m => m.CustomNodeTypeVM),
    "AgentNodeType": () => import("@forest/node-type-agents").then(m => m.AgentNodeTypeVM),
    "AgentToolNodeType": () => import("@forest/node-type-agents").then(m => m.AgentToolNodeTypeVM),
    "MCPNodeType": () => import("@forest/node-type-agents").then(m => m.MCPNodeTypeVM),
    "A2ANodeType": () => import("@forest/node-type-agents").then(m => m.A2ANodeTypeVM),
    "CodeInterpreterNodeType": () => import("@forest/node-type-agents").then(m => m.CodeInterpreterNodeTypeVM),
    "KnowledgeNodeType": () => import("@forest/node-type-agents").then(m => m.KnowledgeNodeTypeVM),
    "MongoDataGridNodeType": () => import("@forest/node-type-mongo-datagrid").then(m => m.MongoDataGridNodeTypeVM),
    "EditorNodeType": async () => EditorNodeTypeVM,
    "ReaderNodeType": async () => ReaderNodeTypeVM,
};

// Cache for loaded types AND loading promises
const loadedTypes: Record<string, Promise<any>> = {};

export const supportedNodeTypesVM: SupportedNodeTypesVM = async (typeName: string) => {
    // Return from cache if already loading or loaded
    if (loadedTypes[typeName]) {
        return loadedTypes[typeName];
    }

    // Load the type dynamically
    if (typeName in typeModules) {
        try {
            // Store the promise in cache before awaiting
            loadedTypes[typeName] = typeModules[typeName]().then(nodeType => {
                console.log(`Loaded node type VM: ${typeName}`);
                return nodeType;
            });
            return await loadedTypes[typeName];
        } catch (error) {
            console.error(`Failed to load node type VM: ${typeName}`, error);
            delete loadedTypes[typeName]; // Remove failed promise from cache
            return null;
        }
    }

    return null;
}