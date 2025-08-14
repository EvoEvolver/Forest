import { TreeVM, NodeVM } from "@forest/schema/src/viewModel";
import { NodeM } from "@forest/schema/src/model";
import { supportedNodeTypesM } from "@forest/node-types/src/model";

export interface SearchResult {
    nodeId: string;
    title: string;
    content: string;
    matchScore: number;
}

export class SearchService {
    /**
     * Search through all nodes in the tree using their renderPrompt content
     */
    static searchTree(tree: TreeVM, query: string): SearchResult[] {
        if (!query.trim() || !tree) {
            return [];
        }

        const results: SearchResult[] = [];
        const searchQuery = query.toLowerCase().trim();
        
        // Access the underlying TreeM to get node data directly
        const treeM = tree.treeM;
        const nodeDict = treeM.nodeDict;
        
        // Iterate through all nodes in the TreeM
        nodeDict.forEach((nodeYMap, nodeId) => {
            try {
                // Create NodeM from the YMap data
                const nodeM = new NodeM(nodeYMap, nodeId, treeM);
                const nodeTypeClass = supportedNodeTypesM(nodeM.ymap.get("nodeTypeName"));
                
                if (!nodeTypeClass) {
                    return; // Skip this node
                }

                // Get content using renderPrompt
                const content = nodeTypeClass.renderPrompt(nodeM);
                const title = nodeM.ymap.get("title") || "";
                
                // Check if query matches title or content
                const titleMatch = title.toLowerCase().includes(searchQuery);
                const contentMatch = content.toLowerCase().includes(searchQuery);
                
                if (titleMatch || contentMatch) {
                    // Calculate match score (title matches get higher score)
                    let matchScore = 0;
                    if (titleMatch) {
                        matchScore += 10;
                        if (title.toLowerCase().startsWith(searchQuery)) {
                            matchScore += 5; // Bonus for prefix match
                        }
                    }
                    if (contentMatch) {
                        matchScore += 1;
                        // Count occurrences in content
                        const occurrences = (content.toLowerCase().match(new RegExp(searchQuery, 'g')) || []).length;
                        matchScore += occurrences * 0.5;
                    }
                    
                    results.push({
                        nodeId: nodeId,
                        title: title || "Untitled",
                        content: this.getContentPreview(content, searchQuery),
                        matchScore
                    });
                }
            } catch (error) {
                console.warn(`Error processing node ${nodeId}:`, error);
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
     * Get a preview of content with search terms highlighted context
     */
    private static getContentPreview(content: string, query: string, maxLength: number = 150): string {
        if (!content) return "";
        
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const queryIndex = lowerContent.indexOf(lowerQuery);
        
        if (queryIndex === -1) {
            // No match found, return beginning of content
            return content.length > maxLength ? content.substring(0, maxLength) + "..." : content;
        }
        
        // Try to center the preview around the match
        const start = Math.max(0, queryIndex - Math.floor(maxLength / 2));
        const end = Math.min(content.length, start + maxLength);
        
        let preview = content.substring(start, end);
        
        // Add ellipsis if truncated
        if (start > 0) preview = "..." + preview;
        if (end < content.length) preview = preview + "...";
        
        return preview;
    }
}