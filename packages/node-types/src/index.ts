import {SupportedNodeTypesMap} from "@forest/schema"
import {EditorNodeType} from "@forest/node-type-editor"
import {ReaderNodeType} from "@forest/node-type-reader"
// @ts-ignore
const typeModules = {
    "CustomNodeType": () => import("@forest/node-components").then(m => new m.CustomNodeType()),
    "AgentNodeType": () => import("@forest/node-type-agents").then(m => new m.AgentNodeType()),
    "AgentToolNodeType": () => import("@forest/node-type-agents").then(m => new m.AgentToolNodeType()),
    "CodeInterpreterNodeType": () => import("@forest/node-type-agents").then(m => new m.CodeInterpreterNodeType()),
    "EditorNodeType": async () => new EditorNodeType(),
    "ReaderNodeType": async () => new ReaderNodeType()
};

// Cache for loaded types AND loading promises
const loadedTypes: Record<string, Promise<any>> = {};

export const supportedNodeTypes: SupportedNodeTypesMap = async (typeName: string) => {
    // Return from cache if already loading or loaded
    if (loadedTypes[typeName]) {
        return loadedTypes[typeName];
    }

    // Load the type dynamically
    if (typeName in typeModules) {
        try {
            // Store the promise in cache before awaiting
            loadedTypes[typeName] = typeModules[typeName]().then(nodeType => {
                console.log(`Loaded node type: ${typeName}`);
                return nodeType;
            });
            return await loadedTypes[typeName];
        } catch (error) {
            console.error(`Failed to load node type: ${typeName}`, error);
            delete loadedTypes[typeName]; // Remove failed promise from cache
            return null;
        }
    }

    return null;
}