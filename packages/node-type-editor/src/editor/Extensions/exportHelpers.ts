import {EditorNodeTypeM} from "../..";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {NodeM, NodeVM} from "@forest/schema";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
async function calculateSHA1(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);

    const hashBuffer = await crypto.subtle.digest('SHA-1', data);  // returns a promise
    const hashArray = Array.from(new Uint8Array(hashBuffer));        // convert buffer to byte array
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');  // convert bytes to hex
    return hashHex;
}

async function generateContentHash(content: string): Promise<string> {
    return (await calculateSHA1(content)).slice(0, 4);
}

function createDOMFromHTML(content: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(`<div>${content}</div>`, 'text/html');
}

export function getEditorContentExceptExports(currentNode: NodeM): string {
    const content = EditorNodeTypeM.getEditorContent(currentNode);
    const document = createDOMFromHTML(content);
    const wrapper = document.body.firstElementChild as HTMLElement;

    // Remove all export divs
    const exportDivs = wrapper.querySelectorAll('div.export');
    exportDivs.forEach(div => div.remove());

    return wrapper.innerHTML.trim();
}

export function removeExportContent(content: string): string {
    const document = createDOMFromHTML(content);
    const wrapper = document.body.firstElementChild as HTMLElement;

    // Remove all export divs
    const exportDivs = wrapper.querySelectorAll('div.export');
    exportDivs.forEach(div => div.remove());

    return wrapper.innerHTML.trim();
}

export function extractExportContent(content: string): string {
    const document = createDOMFromHTML(content);
    const wrapper = document.body.firstElementChild as HTMLElement;

    // Find the first export div
    const exportDiv = wrapper.querySelector('div.export');
    return exportDiv ? exportDiv.innerHTML.trim() : "";
}

export function extractExportContentAndHash(content: string): [string, string] {
    const document = createDOMFromHTML(content);
    const wrapper = document.body.firstElementChild as HTMLElement;

    // Find the first export div
    const exportDiv = wrapper.querySelector('div.export');
    const hash = exportDiv?.getAttribute('hash') || '';
    return [exportDiv ? exportDiv.innerHTML.trim() : "", hash]
}

export async function generateExportSummary(allContent: string, currentContent: string, authToken: string, userPrompt?: string): Promise<string> {
    const prompt = `
You are a professional writer. Your task is to write well-written paragraph(s) based on the raw content provided.

<raw_content>
${allContent}
</raw_content>

<current_paragraphs>
${currentContent}
</current_paragraphs>
${userPrompt ? `
<user_instructions>
${userPrompt}
</user_instructions>
` : ''}
Please write a paragraph based on the raw content. You must:
- If the current paragraph is not empty, don't make unnecessary changes. You are encouraged to keep the original contents as much as possible.
- If there is a mismatch between the current paragraphs and the raw content, make paragraphs align with the raw content.
- You should not drop any key information in the raw content.
- Be written in a clear, professional style${userPrompt ? '\n- Follow any additional instructions provided above' : ''}

<output_format>
You should only return the HTML content of the paragraph without any additional text or formatting.
You should keep the links in the original content and put them in a proper place.
</output_format>
`;

    const message = new NormalMessage({
        content: prompt,
        author: "user",
        role: "user",
    });

    return await fetchChatResponse([message.toJson() as any], "gpt-4.1", authToken);
}

export async function updateExportContent(node: NodeVM, summary: string, sourceContent: string): Promise<void> {
    await stageThisVersion(node.nodeM, "Before export update");

    const currentContent = EditorNodeTypeM.getEditorContent(node.nodeM);
    const contentHash = await generateContentHash(sourceContent);

    const document = createDOMFromHTML(currentContent);
    const wrapper = document.body.firstElementChild as HTMLElement;

    // Find the first export div and update it
    const exportDiv = wrapper.querySelector('div.export');
    if (exportDiv) {
        exportDiv.setAttribute('hash', contentHash);
        exportDiv.innerHTML = summary;

        EditorNodeTypeM.setEditorContent(node.nodeM, wrapper.innerHTML);
    }
}

export interface UpdateExportOptions {
    onShowConfirmation?: (currentContent: string, summaryContent: string) => void;
    onError?: (error: any) => void;
    userPrompt?: string;
}

export async function handleUpdateExport(
    node: NodeVM,
    authToken: string,
    options: UpdateExportOptions = {}
): Promise<void> {
    try {
        // Get all content from the editor except export divs
        const allContent = getEditorContentExceptExports(node.nodeM);
        const currentContent = EditorNodeTypeM.getEditorContent(node.nodeM);

        // Extract current export div content
        const existingExportContent = extractExportContent(currentContent);

        const summary = await generateExportSummary(allContent, existingExportContent, authToken, options.userPrompt);

        // If there's existing content, show confirmation dialog
        if (existingExportContent && existingExportContent.length > 0) {
            if (options.onShowConfirmation) {
                options.onShowConfirmation(existingExportContent, summary);
            } else {
                // Fallback: update directly if no confirmation handler provided
                await updateExportContent(node, summary, allContent);
            }
        } else {
            // No existing content, update directly
            await updateExportContent(node, summary, allContent);
        }
    } catch (e) {
        if (options.onError) {
            options.onError(e);
        } else {
            throw e;
        }
    }
}