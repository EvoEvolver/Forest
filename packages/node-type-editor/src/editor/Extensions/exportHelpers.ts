import {EditorNodeTypeM} from "../..";
import {stageThisVersion} from "@forest/schema/src/stageService";
import {NodeM, NodeVM} from "@forest/schema";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";

export function getEditorContentExceptExports(currentNode: NodeM): string {
    const content = EditorNodeTypeM.getEditorContent(currentNode);
    // Remove export div content using regex
    const contentWithoutExports = content.replace(/<div[^>]*class="export"[^>]*>[\s\S]*?<\/div>/gi, '');
    return contentWithoutExports.trim()
}

export function removeExportContent(content: string): string {
    return content.replace(/<div[^>]*class="export"[^>]*>[\s\S]*?<\/div>/gi, '').trim();
}

export function extractExportContent(content: string): string {
    const match = content.match(/<div[^>]*class="export"[^>]*>([\s\S]*?)<\/div>/i);
    return match ? match[1].trim() : "";
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

export async function updateExportContent(node: NodeVM, summary: string): Promise<void> {
    await stageThisVersion(node.nodeM, "Before export update");

    const currentContent = EditorNodeTypeM.getEditorContent(node.nodeM);

    // Update only the export div content, keeping the rest of the node content
    const updatedContent = currentContent.replace(
        /<div([^>]*class="export"[^>]*)>([\s\S]*?)<\/div>/i,
        `<div$1>${summary}</div>`
    );

    EditorNodeTypeM.setEditorContent(node.nodeM, updatedContent);
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
        const exportMatch = currentContent.match(/<div[^>]*class="export"[^>]*>([\s\S]*?)<\/div>/i);
        const existingExportContent = exportMatch ? exportMatch[1].trim() : "";

        const summary = await generateExportSummary(allContent, existingExportContent, authToken, options.userPrompt);

        // If there's existing content, show confirmation dialog
        if (existingExportContent && existingExportContent.length > 0) {
            if (options.onShowConfirmation) {
                options.onShowConfirmation(existingExportContent, summary);
            } else {
                // Fallback: update directly if no confirmation handler provided
                await updateExportContent(node, summary);
            }
        } else {
            // No existing content, update directly
            await updateExportContent(node, summary);
        }
    } catch (e) {
        if (options.onError) {
            options.onError(e);
        } else {
            throw e;
        }
    }
}