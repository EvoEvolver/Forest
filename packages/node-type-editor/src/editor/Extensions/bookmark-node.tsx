import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { BookmarkCard } from '../../components/BookmarkCard';
import { WebsiteMetadata } from '../../services/bookmarkService';

// Define the bookmark node attributes
export interface BookmarkAttributes {
    url: string;
    title?: string;
    description?: string;
    favicon?: string;
    loading?: boolean;
}

// React component for rendering the bookmark
const BookmarkNodeView = ({ node, updateAttributes, deleteNode }: any) => {
    const { url, title, description, favicon, loading } = node.attrs as BookmarkAttributes;

    const metadata: WebsiteMetadata | undefined = title ? {
        url,
        title,
        description: description || '',
        favicon: favicon || ''
    } : undefined;

    return (
        <NodeViewWrapper 
            className="bookmark-node-wrapper" 
            style={{ 
                display: 'inline-block',
                verticalAlign: 'top',
                margin: '2px 4px'
            }}
        >
            <BookmarkCard
                metadata={metadata}
                loading={loading}
                error={!loading && !metadata ? 'Failed to load bookmark' : undefined}
                style={{
                    cursor: 'pointer',
                    userSelect: 'none'
                }}
            />
        </NodeViewWrapper>
    );
};

// Declare the commands for the Bookmark extension
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        bookmark: {
            /**
             * Insert a bookmark node
             */
            insertBookmark: (attributes: BookmarkAttributes) => ReturnType;
        };
    }
}

export const BookmarkNode = Node.create({
    name: 'bookmark',

    // This is an inline node that can appear within text
    group: 'inline',
    inline: true,
    atom: true,

    // Define the attributes for the bookmark node
    addAttributes() {
        return {
            url: {
                default: null,
                parseHTML: element => element.getAttribute('data-url'),
                renderHTML: attributes => {
                    if (!attributes.url) return {};
                    return { 'data-url': attributes.url };
                },
            },
            title: {
                default: null,
                parseHTML: element => element.getAttribute('data-title'),
                renderHTML: attributes => {
                    if (!attributes.title) return {};
                    return { 'data-title': attributes.title };
                },
            },
            description: {
                default: null,
                parseHTML: element => element.getAttribute('data-description'),
                renderHTML: attributes => {
                    if (!attributes.description) return {};
                    return { 'data-description': attributes.description };
                },
            },
            favicon: {
                default: null,
                parseHTML: element => element.getAttribute('data-favicon'),
                renderHTML: attributes => {
                    if (!attributes.favicon) return {};
                    return { 'data-favicon': attributes.favicon };
                },
            },
            loading: {
                default: false,
                parseHTML: element => element.getAttribute('data-loading') === 'true',
                renderHTML: attributes => {
                    return { 'data-loading': attributes.loading ? 'true' : 'false' };
                },
            },
        };
    },

    // Define how the node is parsed from HTML
    parseHTML() {
        return [
            {
                tag: 'span[data-type="bookmark"]',
            },
        ];
    },

    // Define how the node is rendered to HTML
    renderHTML({ HTMLAttributes }) {
        return [
            'span',
            mergeAttributes({ 'data-type': 'bookmark' }, HTMLAttributes),
            0,
        ];
    },

    // Use React component for rendering in the editor
    addNodeView() {
        return ReactNodeViewRenderer(BookmarkNodeView);
    },

    // Add commands for inserting bookmarks
    addCommands() {
        return {
            insertBookmark: (attributes: BookmarkAttributes) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: attributes,
                });
            },
        };
    },
});