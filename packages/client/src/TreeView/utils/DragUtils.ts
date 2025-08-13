/**
 * Shared drag utilities for TreeView and NavigatorLayer components
 */

/**
 * Creates a standardized drag image for node dragging operations
 * Used by both TreeView and NavigatorLayer to maintain consistent styling
 */
export const createDragImage = (nodeTitle: string): HTMLElement => {
    const dragImageEl = document.createElement('div');
    dragImageEl.style.cssText = `
        background: white;
        border: 1px solid rgba(0, 0, 0, 0.12);
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 400;
        color: rgba(0, 0, 0, 0.87);
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        opacity: 0.8;
        white-space: nowrap;
        font-family: inherit;
        max-width: 300px;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
    `;
    dragImageEl.textContent = nodeTitle || 'Untitled Node';
    return dragImageEl;
};

/**
 * Sets up a drag image for a drag event and automatically cleans it up
 */
export const setupDragImage = (e: React.DragEvent, nodeTitle: string): void => {
    const dragImageEl = createDragImage(nodeTitle);

    // Temporarily add to DOM, set as drag image, then remove
    document.body.appendChild(dragImageEl);
    e.dataTransfer.setDragImage(dragImageEl, -15, 14);
    setTimeout(() => document.body.removeChild(dragImageEl), 0);
};

/**
 * Sets up standard drag data for node dragging operations
 * Ensures compatibility between TreeView and NavigatorLayer
 */
export const setupDragData = (e: React.DragEvent, nodeId: string, parentId?: string): void => {
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('nodeId', nodeId);
    e.dataTransfer.setData('text/plain', nodeId);
    if (parentId) {
        e.dataTransfer.setData('parentId', parentId);
    }
};

/**
 * Extracts node ID from drag event data
 * Provides fallback for different data transfer methods
 */
export const getDraggedNodeId = (e: React.DragEvent): string | null => {
    return e.dataTransfer.getData('nodeId') || e.dataTransfer.getData('text/plain') || null;
};

/**
 * Calculates drop position based on mouse position within target element
 */
export const calculateDropPosition = (
    e: React.DragEvent,
    allowCenter: boolean = false
): 'top' | 'bottom' | 'center' => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    if (allowCenter) {
        if (y < height / 3) {
            return 'top';
        } else if (y > (height * 2) / 3) {
            return 'bottom';
        } else {
            return 'center';
        }
    } else {
        return y < height / 2 ? 'top' : 'bottom';
    }
};