import {SupportedNodeTypesMap} from "@forest/schema"
import {CustomNodeType} from "./CustomNodeType";
import { EditorNodeType } from "@forest/node-type-editor";

export const supportedNodeTypes: SupportedNodeTypesMap = {
    "CustomNodeType": new CustomNodeType(),
    "EditorNodeType": new EditorNodeType()
}