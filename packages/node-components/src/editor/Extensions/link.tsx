import {Mark, mergeAttributes} from "@tiptap/core";
import React, {useEffect, useState} from "react";
import {Card, IconButton, Link as MuiLink, TextField} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from "@mui/icons-material/Delete";

// 1. Declare the commands for the Link extension
declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        link: {
            /**
             * Set a link mark
             */
            setLink: ({href}: { href: string }) => ReturnType;
            /**
             * Unset a link mark
             */
            unsetLink: () => ReturnType;
        };
    }
}

// 2. Define the options for the extension
interface LinkOptions {
    HTMLAttributes: Record<string, any>;
    onLinkActivated: (href: string | null, editor: any, options: any) => void;
}


// 3. Create the Link Extension
export const LinkExtension = Mark.create<LinkOptions>({
    name: "link",

    // A link cannot be split, and you can't have other marks inside it.
    inclusive: false,
    exclusive: true,

    addOptions() {
        return {
            HTMLAttributes: {
                target: '_blank',
                rel: 'noopener noreferrer nofollow',
                class: 'editor-link', // Add a class for styling
            },
            onLinkActivated: () => {
            },
        };
    },

    // 4. Add attributes to the mark (href)
    addAttributes() {
        return {
            href: {
                default: null,
            },
        };
    },

    // 5. Define how the mark is parsed from HTML
    parseHTML() {
        return [
            {
                // Look for anchor tags with an href attribute
                tag: "a[href]:not([data-type])",
                getAttrs: (el) => {
                    const href = (el as HTMLAnchorElement).getAttribute("href");
                    // Return false if href is empty to ignore the mark
                    return href?.trim() ? {href} : false;
                }
            },
        ];
    },

    // 6. Define how the mark is rendered to HTML
    renderHTML({HTMLAttributes}) {
        // Render an anchor tag with merged attributes
        return [
            "a",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
            0, // "0" means the content of the node should be rendered inside this tag
        ];
    },

    // 7. Add commands to set and unset the link
    addCommands() {
        return {
            setLink: (props) => ({commands}) => {
                if (!props.href) {
                    return false;
                }
                return commands.setMark(this.name, props)
            },
            unsetLink: () => ({commands}) => {
                return commands.unsetMark(this.name);
            },
        };
    },

    // 8. Track selection updates to show/hide the hover menu
    onSelectionUpdate() {
        const {$from} = this.editor.state.selection;
        const marks = $from.marks();

        // If there are no marks, deactivate the link
        if (!marks.length) {
            this.options.onLinkActivated(null, this.editor, null);
            return;
        }

        const linkMark = this.editor.schema.marks.link;
        const activeLinkMark = marks.find((mark) => mark.type === linkMark);

        // Find the active link's href
        const activeUrl = activeLinkMark?.attrs.href || null;
        this.options.onLinkActivated(activeUrl, this.editor, null);
    },
});


/**
 * React component for the Link hover/bubble menu.
 */
export const LinkHover = ({hoveredEl, editor, options}) => {
    const href = hoveredEl.getAttribute("href");
    const [editedHref, setEditedHref] = useState(href || "");
    const [isEditing, setIsEditing] = useState(options['inputOn'] || false);

    // Handler to update the link's href
    const handleLinkUpdate = () => {
        if (editedHref?.trim()) {
            // Find the mark range and update its href attribute
            editor.chain().focus().extendMarkRange('link').setLink({href: editedHref}).run();
        }
        setIsEditing(false);
    };

    // Handler to remove the link mark entirely
    const handleLinkRemove = () => {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
    };

    // Update the local state if the element changes
    useEffect(() => {
        const newHref = hoveredEl.getAttribute("href");
        setEditedHref(newHref);
    }, [hoveredEl]);

    return (
        <Card sx={{width: 'fit-content', p: 0.5, display: 'flex', alignItems: 'center'}}>
            {isEditing ? (
                <TextField
                    size="small"
                    value={editedHref}
                    onChange={(e) => setEditedHref(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleLinkUpdate();
                            e.preventDefault(); // Prevent form submission
                        }
                    }}
                    onBlur={handleLinkUpdate} // Save when focus is lost
                    autoFocus
                />
            ) : (
                <>
                    <MuiLink
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                            p: '0 8px',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            maxWidth: '250px'
                        }}
                    >
                        {href}
                    </MuiLink>
                    <IconButton size="small" onClick={() => setIsEditing(true)} title="Edit link">
                        <EditIcon fontSize="inherit"/>
                    </IconButton>
                    <IconButton size="small" onClick={handleLinkRemove} title="Remove link">
                        <DeleteIcon fontSize="inherit"/>
                    </IconButton>
                </>
            )}
        </Card>
    );
};

/**
 * A helper function to manage the state of the hover/bubble menu.
 * This should be passed to the `onLinkActivated` option of the extension.
 */
export function makeOnLinkActivated(setHoverElements) {
    return (href, editor, options) => {
        const _options = options || {};

        // If href is null, it means no link is active, so we clear the hover elements
        if (!href) {
            setHoverElements(prev => {return prev.filter(el => el.source !== "link")})
            return;
        }

        // Find the DOM element corresponding to the active link
        // We look at the element at the cursor's current position
        const {from} = editor.state.selection;
        const domNode = editor.view.domAtPos(from).node;
        let el = domNode.nodeType === Node.TEXT_NODE ? domNode.parentElement : domNode as HTMLElement;

        // Ensure we've found the correct anchor tag
        if (el.tagName !== 'A' || el.getAttribute('href') !== href) {
            // As a fallback, query the DOM for the link. This is less precise if multiple identical links exist.
            const foundEl = editor.view.dom.querySelector(`a[href="${href}"]`);
            if (foundEl) {
                el = foundEl;
            } else {
                setHoverElements(prev => {return prev.filter(el => el.source !== "link")})
                return;
            }
        }

        // Create the hover element object to be rendered
        const hoverElement = {
            source: 'link',
            el: el,
            render: (el, editor) => (
                <LinkHover
                    key={href} // Use href as a key for React
                    hoveredEl={el}
                    editor={editor}
                    options={{..._options}}
                />
            )
        };
        setHoverElements([hoverElement]);
    };
}
