import {Extension} from '@tiptap/core'
import {Plugin, PluginKey} from '@tiptap/pm/state'
import React, {useCallback, useEffect, useRef, useState} from 'react'
import {Card, List, ListItem, ListItemIcon, ListItemText} from '@mui/material'
import ImageIcon from '@mui/icons-material/Image'
import WebIcon from '@mui/icons-material/Web'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        slashCommand: {
            insertSlashCommand: () => ReturnType
        }
    }
}

interface SlashCommandOptions {
    onSlashActivated: (slashPos: number | null, editor: any) => void
}

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
    name: 'slashCommand',

    addOptions() {
        return {
            onSlashActivated: () => {
            },
        }
    },

    addCommands() {
        return {
            insertSlashCommand: () => ({commands}) => {
                return commands.insertContent('\\')
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
                        const isAfterSlash = textAt === '\\'

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
                        if (event.key === '\\') {
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
                                    extension.options.onSlashActivated(from, extension.editor)
                                }
                            }, 0)
                        } else if (event.key === 'Escape' && isAfterSlash && isMenuVisible) {
                            extension.options.onSlashActivated(null, extension.editor)
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
        if (textAt !== '\\') {
            this.options.onSlashActivated(null, this.editor)
            return
        }

        // Check if the slash is in a valid position
        const beforeSlash = textBefore.slice(0, -1) // Remove the slash itself
        const isValidPosition = beforeSlash === '' || /\s$/.test(beforeSlash)

        if (!isValidPosition) {
            this.options.onSlashActivated(null, this.editor)
        }
    },
})

export const SlashCommandMenu: React.FC<{ editor: any, slashPos: number }> = ({editor, slashPos}) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const menuRef = useRef<HTMLDivElement>(null)

    const closeMenu = useCallback(() => {
        // Find the extension and call its onSlashActivated callback to close the menu
        const extensions = editor.extensionManager?.extensions || []
        const slashExtension = extensions.find((ext: any) => ext.name === 'slashCommand')
        if (slashExtension?.options?.onSlashActivated) {
            slashExtension.options.onSlashActivated(null, editor)
        }
    }, [editor])

    const commands = [
        {
            title: 'Image',
            description: 'Upload an image',
            icon: <ImageIcon/>,
            action: () => {
                // Remove the backslash
                editor.chain().focus().deleteRange({from: slashPos, to: slashPos + 1}).run()

                // Insert image upload node
                editor.chain().focus().insertImageUpload({
                    src: null,
                    alt: '',
                    uploading: false
                }).run()

                // Close the menu
                closeMenu()
            }
        },
        {
            title: 'Embed',
            description: 'Embed a webpage',
            icon: <WebIcon/>,
            action: () => {
                // Remove the backslash
                editor.chain().focus().deleteRange({from: slashPos, to: slashPos + 1}).run()

                // Insert iframe node
                editor.chain().focus().insertIframe({
                    src: null
                }).run()

                // Close the menu
                closeMenu()
            }
        }
    ]

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
                commands[selectedIndex].action()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [selectedIndex, commands, editor, slashPos])

    return (
        <Card ref={menuRef} data-slash-menu="true" sx={{
            minWidth: 200,
            maxHeight: 300,
            overflow: 'auto',
            boxShadow: 3
        }}>
            <List dense>
                {commands.map((command, index) => (
                    <ListItem
                        key={command.title}
                        onClick={command.action}
                        sx={{
                            cursor: 'pointer',
                            backgroundColor: index === selectedIndex ? 'action.hover' : 'transparent'
                        }}
                    >
                        <ListItemIcon>
                            {command.icon}
                        </ListItemIcon>
                        <ListItemText
                            primary={command.title}
                            secondary={command.description}
                        />
                    </ListItem>
                ))}
            </List>
        </Card>
    )
}

export const makeOnSlashActivated = (setHoverElements: Function) => {
    return (slashPos: number | null, editor: any) => {
        if (slashPos === null) {
            // Clear slash command menu
            setHoverElements((prev: any[]) => prev.filter((el: any) => el.source !== 'slash-command'))
            return
        }

        // Find the DOM position for the slash
        try {
            const domPos = editor.view.domAtPos(slashPos)
            let targetElement = domPos.node

            if (targetElement.nodeType === Node.TEXT_NODE) {
                targetElement = targetElement.parentElement
            }

            const hoverElement = {
                source: 'slash-command',
                el: targetElement,
                render: () => (
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
    }
}