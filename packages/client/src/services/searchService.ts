import {NodeM, TreeM} from "@forest/schema/src/model";
import { supportedNodeTypesM } from "@forest/node-types/src/model";
import {NormalMessage} from "@forest/agent-chat/src/MessageTypes";
import {fetchChatResponse} from "@forest/agent-chat/src/llm";
import pRetry from 'p-retry';

export interface SearchResult {
    nodeId: string;
    title: string;
    content: string;
    matchScore: number;
}

export class SearchService {
    /**
     * Search through all nodes in the tree using their renderPrompt content with regex support
     */
    static searchTreeByRegex(tree: TreeM, query: string): SearchResult[] {
        if (!query.trim() || !tree) {
            return [];
        }

        const results: SearchResult[] = [];

        // Try to create a RegExp from the query, fallback to literal string search
        let searchRegex: RegExp;
        try {
            searchRegex = new RegExp(query, 'i'); // case insensitive
        } catch (error) {
            // If regex is invalid, fall back to literal string search
            searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }
        
        // Access the underlying TreeM to get node data directly

        const aliveNodes = []
        const rootNode = tree.getRoot()
        // dfs search from the root
        const getSubTreeNodes = (nodeM: NodeM) => {
            if (nodeM.data()["archived"]=== true) {
                return; // Skip archived nodes
            }
            aliveNodes.push(nodeM);
            const children = tree.getChildren(nodeM);
            for (const child of children) {
                getSubTreeNodes(child);
            }
        }
        if (rootNode) {
            getSubTreeNodes(rootNode);
        }
        // Iterate through all nodes in the TreeM
        aliveNodes.forEach((nodeM) => {
            try {
                const nodeTypeClass = supportedNodeTypesM(nodeM.ymap.get("nodeTypeName"));
                
                if (!nodeTypeClass) {
                    return; // Skip this node
                }

                // Get content using renderPrompt and custom extractors
                let content = nodeTypeClass.renderPrompt(nodeM);
                const title = nodeM.ymap.get("title") || "";
                
                // If renderPrompt returns empty, try to extract content based on node type
                if (!content || content.trim() === "") {
                    content = this.extractNodeContent(nodeM, nodeM.ymap.get("nodeTypeName"));
                }
                
                // Check if regex matches title or content
                const titleMatch = searchRegex.test(title);
                const contentMatch = searchRegex.test(content);

                if (titleMatch || contentMatch) {
                    // Calculate match score (title matches get higher score)
                    let matchScore = 0;
                    if (titleMatch) {
                        matchScore += 10;
                        // For regex search, check if it matches from the beginning
                        const prefixRegex = new RegExp(`^${query}`, 'i');
                        try {
                            if (prefixRegex.test(title)) {
                                matchScore += 5; // Bonus for prefix match
                            }
                        } catch (error) {
                            // If prefix regex fails, skip bonus
                        }
                    }
                    if (contentMatch) {
                        matchScore += 1;
                        // Count occurrences in content using global regex
                        try {
                            const globalRegex = new RegExp(searchRegex.source, 'gi');
                            const matches = content.match(globalRegex);
                            const occurrences = matches ? matches.length : 0;
                            matchScore += occurrences * 0.5;
                        } catch (error) {
                            // If global regex fails, give base score
                            matchScore += 0.5;
                        }
                    }

                    results.push({
                        nodeId: nodeM.id,
                        title: title || "Untitled",
                        content: this.getContentPreview(content, searchRegex),
                        matchScore
                    });
                }
            } catch (error) {
                console.warn(`Error processing node ${nodeM.id}:`, error);
            }
        });
        
        // Sort by match score (descending) and then by title
        return results.sort((a, b) => {
            if (b.matchScore !== a.matchScore) {
                return b.matchScore - a.matchScore;
            }
            return a.title.localeCompare(b.title);
        });
    }

    /**
     * Search through all nodes in the tree using their renderPrompt content
     */
    static searchTree(tree: TreeM, query: string): SearchResult[] {
        return this.searchTreeByRegex(tree, query);
    }

    /**
     * Extract content from node based on its type when renderPrompt returns empty
     */
    private static extractNodeContent(nodeM: NodeM, nodeTypeName: string): string {
        try {
            switch (nodeTypeName) {
                case "EditorNodeType":
                    return this.extractEditorContent(nodeM);
                case "CustomNodeType":
                    return this.extractCustomNodeContent(nodeM);
                case "EmbeddedNodeType":
                    return this.extractEmbeddedContent(nodeM);
                default:
                    return "";
            }
        } catch (error) {
            console.warn(`Error extracting content for node type ${nodeTypeName}:`, error);
            return "";
        }
    }
    
    /**
     * Extract content from EditorNodeType (HTML content)
     */
    private static extractEditorContent(nodeM: NodeM): string {
        try {
            const ydata = nodeM.ydata();
            if (ydata && ydata.has("ydatapaperEditor")) {
                // This is a simplified extraction - ideally we'd use the editor's getHTML method
                // but that requires creating an editor instance which is complex in this context
                const xmlFragment = ydata.get("ydatapaperEditor");
                if (xmlFragment && typeof xmlFragment.toString === 'function') {
                    // Extract text from XML fragment - this is a simplified approach
                    const htmlContent = xmlFragment.toString();
                    // Strip HTML tags for search (basic approach)
                    return htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                }
            }
            return "";
        } catch (error) {
            return "";
        }
    }
    
    /**
     * Extract content from CustomNodeType (tabs content)
     */
    private static extractCustomNodeContent(nodeM: NodeM): string {
        try {
            const tabs = nodeM.ymap.get("tabs");
            if (tabs && typeof tabs === 'object') {
                let content = "";
                // Extract text from all tabs
                for (const [key, value] of Object.entries(tabs)) {
                    if (typeof value === 'string') {
                        // Strip HTML tags if present
                        const textContent = value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                        content += `${key}: ${textContent} `;
                    }
                }
                return content.trim();
            }
            return "";
        } catch (error) {
            return "";
        }
    }
    
    /**
     * Extract content from EmbeddedNodeType
     */
    private static extractEmbeddedContent(nodeM: NodeM): string {
        try {
            const data = nodeM.data();
            if (data && data.embedUrl) {
                return `Embedded content from: ${data.embedUrl}`;
            }
            return "Embedded content (no URL set)";
        } catch (error) {
            return "";
        }
    }
    
    /**
     * Get a preview of content with search terms highlighted context
     */
    private static getContentPreview(content: string, searchRegex: RegExp, maxLength: number = 150): string {
        if (!content) return "";

        // Find the first match using regex
        const match = searchRegex.exec(content);

        if (!match) {
            // No match found, return beginning of content
            return content.length > maxLength ? content.substring(0, maxLength) + "..." : content;
        }

        const matchIndex = match.index;

        // Try to center the preview around the match
        const start = Math.max(0, matchIndex - Math.floor(maxLength / 2));
        const end = Math.min(content.length, start + maxLength);

        let preview = content.substring(start, end);

        // Add ellipsis if truncated
        if (start > 0) preview = "..." + preview;
        if (end < content.length) preview = preview + "...";

        return preview;
    }
}