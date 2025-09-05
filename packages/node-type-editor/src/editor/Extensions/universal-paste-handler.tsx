import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import React from 'react';
import { SuggestionMenu, createPasteSuggestionOptions } from '../../components/SuggestionMenu';
import { BookmarkService } from '../../services/bookmarkService';
import { BookmarkAttributes } from './bookmark-node';

interface UniversalPasteHandlerOptions {
    onBookmarkCreated?: (url: string, metadata: any) => void;
    uploadImage?: (file: File, callback: (attrs: any) => void) => void;
}

interface PasteState {
    showBookmarkMenu: boolean;
    pendingUrl: string | null;
    selectedIndex: number;
    pendingPosition: { from: number; to: number } | null;
}

export const UniversalPasteHandler = Extension.create<UniversalPasteHandlerOptions>({
    name: 'universalPasteHandler',

    addOptions() {
        return {
            onBookmarkCreated: () => {},
            uploadImage: () => {},
        };
    },

    addStorage() {
        return {
            showBookmarkMenu: false,
            pendingUrl: null,
            selectedIndex: 0,
            pendingPosition: null,
        } as PasteState;
    },

    addProseMirrorPlugins() {
        const extension = this;
        return [
            new Plugin({
                props: {
                    handlePaste: (view, event, slice) => {
                        console.log('🎯 Universal paste handler triggered');
                        
                        const items = Array.from(event.clipboardData?.items || []);
                        console.log('📋 Clipboard items:', items.map(item => ({ type: item.type, kind: item.kind })));

                        // Check for images first
                        for (const item of items) {
                            if (item.type.startsWith('image/')) {
                                console.log('🖼️ Image found in clipboard!');
                                event.preventDefault();
                                
                                const file = item.getAsFile();
                                console.log('📁 File from clipboard:', file ? `${file.name} (${file.size} bytes)` : 'null');
                                
                                if (file && extension.options.uploadImage) {
                                    console.log('✅ Valid file obtained, starting image upload...');
                                    
                                    // Insert placeholder node at current cursor position
                                    const { state, dispatch } = view;
                                    const { from } = state.selection;
                                    console.log('📍 Insert position:', from);
                                    
                                    // Get the imageUpload node type from the editor
                                    const imageUploadType = extension.editor.schema.nodes.imageUpload;
                                    if (imageUploadType) {
                                        const node = imageUploadType.create({ uploading: true, error: null, uploadProgress: 0 });
                                        const transaction = state.tr.insert(from, node);
                                        dispatch(transaction);
                                        console.log('✅ Image upload node inserted, starting upload...');

                                        // Start upload with callback
                                        const nodePos = from;
                                        const uploadCallback = (attrs: any) => {
                                            console.log('📝 Image upload callback triggered with attrs:', attrs);
                                            
                                            // Find and update the uploading node
                                            const currentState = view.state;
                                            let targetNode = null;
                                            let targetPos = -1;
                                            
                                            // Search for the uploading node around the original position
                                            for (let pos = Math.max(0, nodePos - 5); pos <= Math.min(currentState.doc.content.size, nodePos + 5); pos++) {
                                                const node = currentState.doc.nodeAt(pos);
                                                if (node && node.type === imageUploadType && node.attrs.uploading) {
                                                    targetNode = node;
                                                    targetPos = pos;
                                                    break;
                                                }
                                            }
                                            
                                            if (targetNode && targetPos >= 0) {
                                                console.log('🎯 Found target node at position:', targetPos);
                                                const newAttrs = { ...targetNode.attrs, ...attrs };
                                                const newNode = imageUploadType.create(newAttrs);
                                                const updateTransaction = currentState.tr.replaceWith(targetPos, targetPos + 1, newNode);
                                                view.dispatch(updateTransaction);
                                                console.log('✅ Node updated successfully');
                                            } else {
                                                console.log('❌ Could not find target node to update');
                                            }
                                        };
                                        
                                        extension.options.uploadImage(file, uploadCallback);
                                    }
                                }
                                return true;
                            }
                        }

                        // Check for text content (potential URLs)
                        const text = event.clipboardData?.getData('text/plain')?.trim() || '';
                        if (text) {
                            console.log('🔗 Text found in clipboard:', text);
                            
                            const bookmarkService = BookmarkService.getInstance();
                            
                            // Check if the pasted content is a single URL
                            const urls = bookmarkService.detectUrls(text);
                            console.log('🔗 Detected URLs:', urls);
                            
                            if (urls.length === 1 && urls[0] === text) {
                                console.log('🔗 Single URL detected, showing suggestion menu');
                                // Prevent all default paste behavior
                                event.preventDefault();
                                event.stopPropagation();
                                
                                // Store the URL and position
                                const { from, to } = view.state.selection;
                                extension.storage.pendingUrl = text;
                                extension.storage.pendingPosition = { from, to };
                                extension.storage.selectedIndex = 0;
                                extension.storage.showBookmarkMenu = true;
                                
                                console.log('🔗 Calling showBookmarkSuggestionMenu');
                                // Show the suggestion menu
                                extension.editor.commands.showBookmarkSuggestionMenu(extension.editor);
                                
                                return true; // Prevent default paste
                            }
                            
                            console.log('🔗 Not a single URL, allowing normal paste');
                        }

                        console.log('❌ No recognizable content found');
                        return false;
                    },
                },
            }),
        ];
    },

    addCommands() {
        return {
            showBookmarkSuggestionMenu: (editor: any) => () => {
                console.log('🔗 showBookmarkSuggestionMenu called, pendingUrl:', this.storage.pendingUrl);
                if (!this.storage.pendingUrl) {
                    console.log('🔗 No pending URL, exiting showBookmarkSuggestionMenu');
                    return;
                }
                
                // Get current cursor position
                const { from } = editor.state.selection;
                const view = editor.view;
                
                // Get cursor coordinates (absolute position in viewport)
                const coords = view.coordsAtPos(from);
                
                // Create a simple reference element positioned at cursor location
                const referenceEl = document.createElement('div');
                referenceEl.style.position = 'fixed';
                referenceEl.style.top = `${coords.bottom}px`;  // Position just below cursor
                referenceEl.style.left = `${coords.left}px`;
                referenceEl.style.width = '1px';
                referenceEl.style.height = '1px';
                referenceEl.style.pointerEvents = 'none';
                referenceEl.style.zIndex = '1000';
                
                // Add to document body so it's positioned relative to viewport
                document.body.appendChild(referenceEl);
                
                console.log('🔗 Created reference element at:', {
                    top: coords.bottom,
                    left: coords.left,
                    coords
                });
                
                // Create menu options
                const options = createPasteSuggestionOptions(this.storage.pendingUrl);
                
                // Create hover element for the existing hover system
                const hoverElement = {
                    source: 'bookmark-paste',
                    el: referenceEl,
                    render: () => (
                        <SuggestionMenu
                            options={options}
                            selectedIndex={this.storage.selectedIndex}
                            visible={true}
                            onSelect={(option, index) => {
                                // Use setTimeout to avoid transaction conflicts when clicking menu items
                                setTimeout(() => {
                                    try {
                                        this.editor.commands.selectBookmarkOption(option, index);
                                    } catch (error) {
                                        console.warn('Transaction conflict ignored:', error);
                                    }
                                }, 0);
                            }}
                        />
                    )
                };
                
                // Add to existing hover system
                const setHoverElements = this.editor.options.setHoverElements;
                console.log('🔗 setHoverElements function:', setHoverElements);
                if (setHoverElements) {
                    console.log('🔗 Setting hover elements');
                    setHoverElements([hoverElement]);
                } else {
                    console.log('🔗 No setHoverElements function available');
                }
                
                // Store reference to element for cleanup
                this.storage.virtualElement = referenceEl;
            },

            hideBookmarkSuggestionMenu: () => () => {
                this.storage.showBookmarkMenu = false;
                this.storage.pendingUrl = null;
                this.storage.pendingPosition = null;
                this.storage.selectedIndex = 0;
                
                // Clear hover elements
                const setHoverElements = this.editor.options.setHoverElements;
                if (setHoverElements) {
                    setHoverElements([]);
                }
                
                // Clean up reference element
                if (this.storage.virtualElement) {
                    document.body.removeChild(this.storage.virtualElement);
                    this.storage.virtualElement = null;
                }
            },

            updateBookmarkSuggestionMenu: () => () => {
                // Re-render the menu with updated selection
                this.editor.commands.showBookmarkSuggestionMenu(this.editor);
            },

            selectCurrentBookmarkOption: () => () => {
                const options = createPasteSuggestionOptions(this.storage.pendingUrl || '');
                const selectedOption = options[this.storage.selectedIndex];
                
                // Use setTimeout to avoid transaction conflicts in keyboard shortcuts
                setTimeout(() => {
                    try {
                        this.editor.commands.selectBookmarkOption(selectedOption, this.storage.selectedIndex);
                    } catch (error) {
                        console.warn('Transaction conflict ignored:', error);
                    }
                }, 0);
                
                return true;
            },

            selectBookmarkOption: (option: any, index: number) => () => {
                const { pendingUrl } = this.storage;
                
                if (!pendingUrl) {
                    this.editor.commands.hideBookmarkSuggestionMenu();
                    return;
                }
                
                this.editor.commands.hideBookmarkSuggestionMenu();
                
                if (option.id === 'paste-link') {
                    // Insert as clickable link using the existing LinkExtension
                    this.editor.chain().focus().setLink({ href: pendingUrl }).insertContent(pendingUrl).run();
                    
                } else if (option.id === 'paste-title') {
                    // Insert temporary loading text first
                    const loadingText = 'Loading...';
                    this.editor.chain().focus().insertContent(loadingText).run();
                    
                    // Move async operations outside of the command
                    setTimeout(async () => {
                        const timeoutId = setTimeout(() => {
                            console.log('⏰ Title fetch timeout, reverting to URL');
                            // Replace loading text with URL link
                            try {
                                const content = this.editor.getHTML();
                                if (content.includes(loadingText)) {
                                    const newContent = content.replace(loadingText, `<a href="${pendingUrl}">${pendingUrl}</a>`);
                                    this.editor.commands.setContent(newContent);
                                }
                            } catch (error) {
                                console.warn('HTML replacement failed, ignored:', error);
                            }
                        }, 15000);
                        
                        // Fetch metadata in background
                        const bookmarkService = BookmarkService.getInstance();
                        
                        try {
                            const metadata = await bookmarkService.fetchMetadata(pendingUrl);
                            clearTimeout(timeoutId);
                            
                            // Replace loading text with title link
                            const title = metadata.title || pendingUrl;
                            try {
                                const content = this.editor.getHTML();
                                if (content.includes(loadingText)) {
                                    const newContent = content.replace(loadingText, `<a href="${pendingUrl}">${title}</a>`);
                                    this.editor.commands.setContent(newContent);
                                }
                            } catch (error) {
                                console.warn('HTML replacement failed, ignored:', error);
                            }
                            
                        } catch (error) {
                            clearTimeout(timeoutId);
                            console.error('Failed to fetch title:', error);
                            
                            // Fallback to URL link
                            try {
                                const content = this.editor.getHTML();
                                if (content.includes(loadingText)) {
                                    const newContent = content.replace(loadingText, `<a href="${pendingUrl}">${pendingUrl}</a>`);
                                    this.editor.commands.setContent(newContent);
                                }
                            } catch (error) {
                                console.warn('HTML replacement failed, ignored:', error);
                            }
                        }
                    }, 0);
                    
                } else if (option.id === 'paste-simple-title') {
                    // Insert as plain HTML anchor tag
                    const htmlContent = `<a href="${pendingUrl}">link</a>`;
                    this.editor.chain().focus().insertContent(htmlContent).run();
                    
                } else if (option.id === 'paste-bookmark') {
                    // Get the editor state and view for direct transaction handling
                    const view = this.editor.view;
                    const { state, dispatch } = view;
                    const { from, to } = this.editor.state.selection;
                    
                    // Get the bookmark node type from the editor
                    const bookmarkType = this.editor.schema.nodes.bookmark;
                    if (bookmarkType) {
                        // Insert loading bookmark first
                        const node = bookmarkType.create({ 
                            url: pendingUrl, 
                            loading: true 
                        });
                        const transaction = state.tr.replaceWith(from, to, node);
                        dispatch(transaction);
                        console.log('✅ Bookmark node inserted, fetching metadata...');

                        // Move async operations outside of the command
                        setTimeout(async () => {
                            const nodePos = from;
                            
                            // Create update callback similar to image upload
                            const updateCallback = (attrs: Partial<BookmarkAttributes>) => {
                                console.log('📝 Bookmark update callback triggered with attrs:', attrs);
                                
                                // Find and update the loading bookmark node
                                const currentState = view.state;
                                let targetNode = null;
                                let targetPos = -1;
                                
                                // Search for the loading bookmark node around the original position
                                for (let pos = Math.max(0, nodePos - 5); pos <= Math.min(currentState.doc.content.size, nodePos + 5); pos++) {
                                    const node = currentState.doc.nodeAt(pos);
                                    if (node && node.type === bookmarkType && node.attrs.loading) {
                                        targetNode = node;
                                        targetPos = pos;
                                        break;
                                    }
                                }
                                
                                if (targetNode && targetPos >= 0) {
                                    console.log('🎯 Found target bookmark node at position:', targetPos);
                                    const newAttrs = { ...targetNode.attrs, ...attrs };
                                    const newNode = bookmarkType.create(newAttrs);
                                    const updateTransaction = currentState.tr.replaceWith(targetPos, targetPos + 1, newNode);
                                    view.dispatch(updateTransaction);
                                    console.log('✅ Bookmark node updated successfully');
                                } else {
                                    console.log('❌ Could not find target bookmark node to update');
                                }
                            };
                            
                            try {
                                // Fetch metadata in background
                                const bookmarkService = BookmarkService.getInstance();
                                const metadata = await bookmarkService.fetchMetadata(pendingUrl);
                                
                                // Update the bookmark with fetched metadata
                                updateCallback({
                                    url: pendingUrl,
                                    title: metadata.title,
                                    description: metadata.description,
                                    favicon: metadata.favicon,
                                    loading: false
                                });
                                
                                // Call callback if provided
                                this.options.onBookmarkCreated?.(pendingUrl, metadata);
                                
                            } catch (error) {
                                console.error('Failed to create bookmark:', error);
                                
                                // Find and delete the loading bookmark node on error
                                const currentState = view.state;
                                for (let pos = Math.max(0, nodePos - 5); pos <= Math.min(currentState.doc.content.size, nodePos + 5); pos++) {
                                    const node = currentState.doc.nodeAt(pos);
                                    if (node && node.type === bookmarkType && node.attrs.loading) {
                                        const deleteTransaction = currentState.tr.delete(pos, pos + 1);
                                        view.dispatch(deleteTransaction);
                                        break;
                                    }
                                }
                            }
                        }, 0);
                    }
                }
            }
        };
    },

    addKeyboardShortcuts() {
        return {
            ArrowDown: () => {
                if (!this.storage.showBookmarkMenu) return false;
                
                this.storage.selectedIndex = (this.storage.selectedIndex + 1) % 4; // Cycle through 0, 1, 2, 3
                this.editor.commands.updateBookmarkSuggestionMenu();
                return true;
            },
            
            ArrowUp: () => {
                if (!this.storage.showBookmarkMenu) return false;
                
                this.storage.selectedIndex = (this.storage.selectedIndex - 1 + 4) % 4; // Cycle through 3, 2, 1, 0
                this.editor.commands.updateBookmarkSuggestionMenu();
                return true;
            },
            
            Enter: () => {
                if (!this.storage.showBookmarkMenu) return false;
                
                this.editor.commands.selectCurrentBookmarkOption();
                return true;
            },
            
            Escape: () => {
                if (!this.storage.showBookmarkMenu) return false;
                
                this.editor.commands.hideBookmarkSuggestionMenu();
                return true;
            },
        };
    },


    onDestroy() {
        this.editor.commands.hideBookmarkSuggestionMenu();
    }
});