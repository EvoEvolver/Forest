import {SupportedNodeTypesMap} from "@forest/schema"
import {CustomNodeType} from "./CustomNodeType";
import {EditorNodeType} from "@forest/node-type-editor";
import {ReaderNodeType} from "@forest/node-type-reader";

export const supportedNodeTypes: SupportedNodeTypesMap = {
    "CustomNodeType": new CustomNodeType(),
    "EditorNodeType": new EditorNodeType(),
    "ReaderNodeType": new ReaderNodeType()
}