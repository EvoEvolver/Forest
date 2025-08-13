import { parseApiSpec } from "./apiParser";

export type JSONObject = { [key: string]: any };

// Parse JSON pointer like "#/components/schemas/addInput"
export function resolveJsonPointer(obj: JSONObject, ref: string): any {
    if (!ref.startsWith('#/')) throw new Error(`Unsupported $ref format: ${ref}`);
    const path = ref.slice(2).split('/');
    return path.reduce((acc, key) => {
        if (!(key in acc)) {
            console.error(`ref: ${ref}`);
            console.error(`missing key: ${key}`);
            console.error(`current object keys:`, Object.keys(acc));
            throw new Error(`Invalid $ref path segment: ${key}`);
        }
        return acc[key];
    }, obj);
}

// Recursively resolve all $ref in the JSON
export function resolveRefs(obj: JSONObject, root: JSONObject): any {
    if (Array.isArray(obj)) {
        return obj.map(item => resolveRefs(item, root));
    }

    if (typeof obj === 'object' && obj !== null) {
        if ('$ref' in obj && typeof obj['$ref'] === 'string') {
            const resolved = resolveJsonPointer(root, obj['$ref']);
            // Recursively resolve the resolved object too
            return resolveRefs(resolved, root);
        }

        const result: JSONObject = {};
        for (const key of Object.keys(obj)) {
            result[key] = resolveRefs(obj[key], root);
        }
        return result;
    }

    return obj; // primitive value
}

export function jsonToSpec(json: string): any {
    try {
        const parsedJson = JSON.parse(json)
        const dereferencedJson = resolveRefs(parsedJson, parsedJson);
        const apiSpec = parseApiSpec(dereferencedJson);
        return apiSpec
    } catch (e) {
        return null;
    }
}

export function generatePromptFromSchema(schema: any): string {
    if (schema.type === 'object' && schema.properties) {
        return Object.entries(schema.properties)
            .map(([key, prop]: [string, any]) => {
                const type = prop.type || 'any';
                const desc = prop.description || '';
                return `"${key}" (${type}): ${desc}`;
            })
            .join('\n');
    }
    if (schema.type === 'array' && schema.items) {
        return `[${generatePromptFromSchema(schema.items)}]`;
    }
    const type = schema.type || 'any';
    const desc = schema.description || '';
    return `(${type}): ${desc}`;
}