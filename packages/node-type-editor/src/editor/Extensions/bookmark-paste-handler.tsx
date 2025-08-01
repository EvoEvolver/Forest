import { Extension } from '@tiptap/core';
import React from 'react';
import { SuggestionMenu, createPasteSuggestionOptions } from '../../components/SuggestionMenu';
import { BookmarkService } from '../../services/bookmarkService';

interface BookmarkPasteHandlerOptions {
    onBookmarkCreated?: (url: string, metadata: any) => void;
    setHoverElements?: (elements: any[]) => void;
}

interface BookmarkPasteState {
    showMenu: boolean;
    pendingUrl: string | null;
    selectedIndex: number;
    pendingPosition: { from: number; to: number } | null;
}

export const BookmarkPasteHandler = Extension.create<BookmarkPasteHandlerOptions>({
    name: 'bookmarkPasteHandler',

    addOptions() {
        return {
            onBookmarkCreated: () => {},
            setHoverElements: () => {},
        };
    },

    addStorage() {
        return {
            showMenu: false,
            pendingUrl: null,
            selectedIndex: 0,
            pendingPosition: null,
        } as BookmarkPasteState;
    },

    onPaste({ editor, event }) {
        console.log('🔗 BookmarkPasteHandler: onPaste triggered');
        const text = event.clipboardData?.getData('text/plain')?.trim() || '';
        console.log('🔗 Pasted text:', text);
        
        const bookmarkService = BookmarkService.getInstance();
        
        // Check if the pasted content is a single URL
        const urls = bookmarkService.detectUrls(text);
        console.log('🔗 Detected URLs:', urls);
        
        if (urls.length === 1 && urls[0] === text) {
            console.log('🔗 Single URL detected, showing suggestion menu');
            // Prevent default paste behavior
            event.preventDefault();
            
            // Store the URL and position
            const { from, to } = editor.state.selection;
            this.storage.pendingUrl = text;
            this.storage.pendingPosition = { from, to };
            this.storage.selectedIndex = 0;
            this.storage.showMenu = true;
            
            console.log('🔗 Calling showSuggestionMenu');
            // Show the suggestion menu
            editor.commands.showSuggestionMenu(editor);
            
            return true; // Prevent default paste
        }
        
        console.log('🔗 Not a single URL, allowing normal paste');
        return false; // Allow normal paste
    },

    addKeyboardShortcuts() {
        return {
            ArrowDown: () => {
                if (!this.storage.showMenu) return false;
                
                this.storage.selectedIndex = this.storage.selectedIndex === 1 ? 0 : 1;
                this.editor.commands.updateSuggestionMenu();
                return true;
            },
            
            ArrowUp: () => {
                if (!this.storage.showMenu) return false;
                
                this.storage.selectedIndex = this.storage.selectedIndex === 0 ? 1 : 0;
                this.editor.commands.updateSuggestionMenu();
                return true;
            },
            
            Enter: () => {
                if (!this.storage.showMenu) return false;
                
                this.editor.commands.selectCurrentOption();
                return true;
            },
            
            Escape: () => {
                if (!this.storage.showMenu) return false;
                
                this.editor.commands.hideSuggestionMenu();
                return true;
            },
        };
    },

    addCommands() {
        return {
            showSuggestionMenu: (editor: any) => () => {
                console.log('🔗 showSuggestionMenu called, pendingUrl:', this.storage.pendingUrl);
                if (!this.storage.pendingUrl) {
                    console.log('🔗 No pending URL, exiting showSuggestionMenu');
                    return;
                }
                
                // Get cursor position for menu placement
                const { from } = editor.state.selection;
                const coords = editor.view.coordsAtPos(from);
                console.log('🔗 Cursor position:', { from, coords });
                
                // Create virtual element for positioning
                const virtualEl = document.createElement('div');
                virtualEl.style.position = 'absolute';
                virtualEl.style.top = `${coords.bottom}px`;
                virtualEl.style.left = `${coords.left}px`;
                virtualEl.style.width = '0px';
                virtualEl.style.height = '0px';
                virtualEl.style.pointerEvents = 'none';
                document.body.appendChild(virtualEl);
                
                // Create menu options
                const options = createPasteSuggestionOptions(this.storage.pendingUrl);
                
                // Create hover element for the existing hover system
                const hoverElement = {
                    source: 'bookmark-paste',
                    el: virtualEl,
                    render: () => (
                        <SuggestionMenu
                            options={options}
                            selectedIndex={this.storage.selectedIndex}
                            visible={true}
                            onSelect={(option, index) => this.editor.commands.selectOption(option, index)}
                            position={{ top: coords.bottom + 5, left: coords.left }}
                        />
                    )
                };
                
                // Add to existing hover system
                const setHoverElements = this.options.setHoverElements;
                console.log('🔗 setHoverElements function:', setHoverElements);
                if (setHoverElements) {
                    console.log('🔗 Setting hover elements');
                    setHoverElements([hoverElement]);
                } else {
                    console.log('🔗 No setHoverElements function available');
                }
                
                // Store reference to virtual element for cleanup
                this.storage.virtualElement = virtualEl;
            },

            hideSuggestionMenu: () => () => {
                this.storage.showMenu = false;
                this.storage.pendingUrl = null;
                this.storage.pendingPosition = null;
                this.storage.selectedIndex = 0;
                
                // Clear hover elements
                const setHoverElements = this.options.setHoverElements;
                if (setHoverElements) {
                    setHoverElements([]);
                }
                
                // Clean up virtual element
                if (this.storage.virtualElement) {
                    document.body.removeChild(this.storage.virtualElement);
                    this.storage.virtualElement = null;
                }
            },

            updateSuggestionMenu: () => () => {
                // Re-render the menu with updated selection
                this.editor.commands.showSuggestionMenu(this.editor);
            },

            selectCurrentOption: () => () => {
                const options = createPasteSuggestionOptions(this.storage.pendingUrl || '');
                const selectedOption = options[this.storage.selectedIndex];
                this.editor.commands.selectOption(selectedOption, this.storage.selectedIndex);
            },

            selectOption: (option: any, index: number) => async () => {
                const { pendingUrl, pendingPosition } = this.storage;
                
                if (!pendingUrl || !pendingPosition) {
                    this.editor.commands.hideSuggestionMenu();
                    return;
                }
                
                this.editor.commands.hideSuggestionMenu();
                
                const { from, to } = pendingPosition;
                
                if (option.id === 'paste-text') {
                    // Insert as plain text
                    this.editor.commands.insertContentAt({ from, to }, pendingUrl);
                    
                } else if (option.id === 'paste-bookmark') {
                    try {
                        // Insert loading bookmark first
                        this.editor.commands.insertContentAt({ from, to }, {
                            type: 'bookmark',
                            attrs: {
                                url: pendingUrl,
                                loading: true
                            }
                        });
                        
                        // Fetch metadata in background
                        const bookmarkService = BookmarkService.getInstance();
                        const metadata = await bookmarkService.fetchMetadata(pendingUrl);
                        
                        // Update the bookmark with fetched metadata
                        this.editor.commands.updateAttributes('bookmark', {
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
                        
                        // Fallback to text insertion
                        this.editor.commands.insertContentAt({ from, to }, pendingUrl);
                    }
                }
            }
        };
    },

    onDestroy() {
        this.editor.commands.hideSuggestionMenu();
    }
});