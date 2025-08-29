/**
 * Highlight component that recursively highlights keywords in React children
 * without using DOM injection - pure React component approach
 */

import React from 'react';
import { Box } from '@mui/material';

interface HighlightProps {
    keyword: string;
    children: React.ReactNode;
    highlightStyle?: React.CSSProperties;
}

/**
 * Highlights keyword in HTML string content
 */
const highlightInHTML = (htmlString: string, keyword: string): string => {
    if (!keyword || !keyword.trim()) {
        return htmlString;
    }

    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    
    // Simple approach: replace text content while preserving HTML structure
    // This is a basic implementation that works for most cases
    return htmlString.replace(regex, '<mark style="background-color: yellow; color: black; font-weight: bold; border-radius: 2px; padding: 1px 2px;">$1</mark>');
};

export const Highlight: React.FC<HighlightProps> = ({
    keyword,
    children,
    highlightStyle = {
        backgroundColor: '#ffeb3b',
        color: '#000',
        fontWeight: 'bold',
        borderRadius: '2px',
        padding: '1px 2px'
    }
}) => {
    // If no keyword, return children as-is
    if (!keyword || !keyword.trim()) {
        return <>{children}</>;
    }

    // Create case-insensitive regex for the keyword
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    

    const processNode = (node: React.ReactNode): React.ReactNode => {
        // Handle strings - split and highlight matches
        if (typeof node === 'string') {
            // Reset regex lastIndex to avoid stateful issues
            regex.lastIndex = 0;
            if (!regex.test(node)) {
                return node;
            }

            // Split by the regex and process each part
            const parts = node.split(regex);
            return parts.map((part, index) => {
                // Create a fresh regex to test each part
                const testRegex = new RegExp(`^(${escapedKeyword})$`, 'i');
                if (testRegex.test(part)) {
                    return (
                        <Box
                            key={index}
                            component="mark"
                            sx={{
                                backgroundColor: 'yellow',
                                color: 'black', // Force black text for better readability
                                fontWeight: 'bold',
                                borderRadius: '2px',
                                padding: '1px 2px'
                            }}
                        >
                            {part}
                        </Box>
                    );
                }
                return part;
            });
        }

        // Handle numbers - convert to string and process
        if (typeof node === 'number') {
            return processNode(String(node));
        }

        // Handle React elements - clone with processed children
        if (React.isValidElement(node)) {
            // Skip processing if this is already a highlight mark to avoid double-highlighting
            if (node.type === 'mark' || (node.props && node.props.component === 'mark')) {
                return node;
            }


            // Special handling for components that use dangerouslySetInnerHTML
            if (node.props && node.props.dangerouslySetInnerHTML && node.props.dangerouslySetInnerHTML.__html) {
                const originalHTML = node.props.dangerouslySetInnerHTML.__html;
                const highlightedHTML = highlightInHTML(originalHTML, keyword);
                
                return React.cloneElement(node as React.ReactElement<any>, {
                    ...node.props,
                    dangerouslySetInnerHTML: { __html: highlightedHTML }
                });
            }

            // For React elements, only process children - avoid modifying props to prevent style issues
            if (node.props && node.props.children) {
                return React.cloneElement(node as React.ReactElement<any>, {
                    ...node.props,
                    children: processNode(node.props.children),
                });
            }

            return node;
        }

        // Handle arrays - process each element
        if (Array.isArray(node)) {
            return node.map((child, index) => (
                <React.Fragment key={index}>
                    {processNode(child)}
                </React.Fragment>
            ));
        }

        // Handle other types (null, undefined, boolean, etc.)
        return node;
    };

    return <>{processNode(children)}</>;
};

export default Highlight;