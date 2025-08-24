import {Extension} from '@tiptap/core'
import {Plugin, PluginKey} from '@tiptap/pm/state'
import React, {useCallback, useEffect, useState} from 'react'
import {SuggestionMenu, SuggestionOption} from '../../components/SuggestionMenu'
import ImageIcon from '@mui/icons-material/Image'
import WebIcon from '@mui/icons-material/Web'
import FileDownloadIcon from '@mui/icons-material/FileDownload'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        slashCommand: {
            insertSlashCommand: () => ReturnType
            displaySlashCommand: (slashPos: number | null, options?: any) => ReturnType
        }
    }
}

interface SlashCommandOptions {
    setHoverElements: (el: any) => void
}

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
    name: 'slashCommand',

    addOptions() {
        return {
            setHoverElements: (el: any) => {
            },
        }
    },

    addCommands() {
        return {
            displaySlashCommand: (slashPos: number | null, options) => ({commands}) => {
                const setHoverElements = this.editor.options?.setHoverElements
                if (!setHoverElements) {
                    return
                }
                let _options = options || {}
                if (!slashPos) {
                    setHoverElements(prev => {
                        return prev.filter(el => el.source !== "slash-command")
                    })
                    return
                }
                
                try {
                    const domPos = this.editor.view.domAtPos(slashPos)
                    let targetElement = domPos.node

                    if (targetElement.nodeType === Node.TEXT_NODE) {
                        targetElement = targetElement.parentElement
                    }

                    const hoverElement = {
                        source: "slash-command",
                        el: targetElement,
                        render: (el, editor) => (
                            <SlashCommandMenu
                                key="slash-command-menu"
                                editor={editor}
                                slashPos={slashPos}
                            />
                        )
                    }

                    setHoverElements([hoverElement])
                } catch (error) {
                    console.warn('Could not position slash command menu:', error)
                }
            },
            insertSlashCommand: () => ({commands}) => {
                return commands.insertContent('/')
            },
        }
    },

    addProseMirrorPlugins() {
        const extension = this
        return [
            new Plugin({
                key: new PluginKey('slash-command'),

                props: {
                    handleKeyDown: (view, event) => {
                        const {selection, doc} = view.state
                        const {from} = selection

                        // Check if we're immediately after a backslash (menu might be active)
                        const textAt = doc.textBetween(from - 1, from, '\n')
                        const isAfterSlash = textAt === '/'

                        // Check if menu is actually visible by looking for the menu element in DOM
                        const menuElement = document.querySelector('[data-slash-menu="true"]')
                        const isMenuVisible = !!menuElement

                        // Handle Enter key when menu is visible and we're after a slash
                        if (event.key === 'Enter' && isAfterSlash && isMenuVisible) {
                            // Prevent default Enter behavior (creating new line)
                            event.preventDefault()
                            // Let the React component handle the Enter key
                            return true
                        }

                        // Handle Arrow keys when menu is visible and we're after a slash
                        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && isAfterSlash && isMenuVisible) {
                            // Prevent default behavior and let React component handle
                            event.preventDefault()
                            return true
                        }

                        // Check if user typed backslash
                        if (event.key === '/') {
                            console.log("Slash command activated at position:", from)
                            // Let the backslash be inserted first
                            setTimeout(() => {
                                // Check text around the current position
                                const textBefore = doc.textBetween(Math.max(0, from - 10), from, '\n')
                                const textAfter = doc.textBetween(from, Math.min(doc.content.size, from + 10), '\n')

                                const beforeSlash = textBefore
                                const afterSlash = textAfter

                                // Show menu if slash is at start of line or after whitespace, and no text immediately after
                                const isValidPosition = beforeSlash === '' || /\s$/.test(beforeSlash)
                                const noTextAfter = afterSlash === '' || /^\s/.test(afterSlash)

                                if (isValidPosition && noTextAfter) {
                                    extension.editor.commands.displaySlashCommand(from)
                                }
                            }, 0)
                        } else if (event.key === 'Escape' && isAfterSlash && isMenuVisible) {
                            extension.editor.commands.displaySlashCommand(null)
                            return true
                        }

                        return false
                    },
                },
            }),
        ]
    },

    onSelectionUpdate() {
        const {selection, doc} = this.editor.state
        const {from} = selection

        // Check if cursor moved away from a slash position
        const textBefore = doc.textBetween(Math.max(0, from - 2), from, '\n')
        const textAt = doc.textBetween(from - 1, from, '\n')

        // If we're not immediately after a backslash, hide the menu
        if (textAt !== '/') {
            this.editor.commands.displaySlashCommand(null)
            return
        }

        // Check if the slash is in a valid position
        const beforeSlash = textBefore.slice(0, -1) // Remove the slash itself
        const isValidPosition = beforeSlash === '' || /\s$/.test(beforeSlash)

        if (!isValidPosition) {
            this.editor.commands.displaySlashCommand(null)
        }
    },
})

export const SlashCommandMenu: React.FC<{ editor: any, slashPos: number }> = ({editor, slashPos}) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const closeMenu = useCallback(() => {
        editor.commands.displaySlashCommand(null)
    }, [editor])

    const commands: SuggestionOption[] = [
        {
            id: 'image',
            label: 'Image',
            description: 'Upload an image',
            icon: <ImageIcon fontSize="small"/>
        },
        {
            id: 'embed',
            label: 'Embed',
            description: 'Embed a webpage',
            icon: <WebIcon fontSize="small"/>
        },
        {
            id: 'export',
            label: 'Export',
            description: 'Create an export container',
            icon: <FileDownloadIcon fontSize="small"/>
        }
    ]

    const handleSelect = useCallback((option: SuggestionOption) => {
        // Remove the backslash
        editor.chain().focus().deleteRange({from: slashPos, to: slashPos + 1}).run()

        if (option.id === 'image') {
            // Insert image upload node
            editor.chain().focus().insertImageUpload({
                src: null,
                alt: '',
                uploading: false
            }).run()
        } else if (option.id === 'embed') {
            // Insert iframe node
            editor.chain().focus().insertIframe({
                src: null
            }).run()
        } else if (option.id === 'export') {
            // Insert export node
            editor.chain().focus().insertExport({}).run()
        }

        // Close the menu
        closeMenu()
    }, [editor, slashPos, closeMenu])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            event.stopPropagation()

            if (event.key === 'ArrowDown') {
                event.preventDefault()
                setSelectedIndex(prev => (prev + 1) % commands.length)
            } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setSelectedIndex(prev => (prev - 1 + commands.length) % commands.length)
            } else if (event.key === 'Enter') {
                event.preventDefault()
                handleSelect(commands[selectedIndex])
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [selectedIndex, commands, handleSelect])

    return (
        <div data-slash-menu="true">
            <SuggestionMenu
                options={commands}
                selectedIndex={selectedIndex}
                onSelect={handleSelect}
                visible={true}
            />
        </div>
    )
}

