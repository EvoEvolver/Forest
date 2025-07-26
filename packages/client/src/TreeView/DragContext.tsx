import React, { createContext, useContext, useState } from 'react';

interface DragContextType {
    isDraggingOverChat: boolean;
    setIsDraggingOverChat: (value: boolean) => void;
    draggedNodeId: string | null;
    setDraggedNodeId: (value: string | null) => void;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDraggingOverChat, setIsDraggingOverChat] = useState(false);
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

    return (
        <DragContext.Provider value={{
            isDraggingOverChat,
            setIsDraggingOverChat,
            draggedNodeId,
            setDraggedNodeId
        }}>
            {children}
        </DragContext.Provider>
    );
};

export const useDragContext = () => {
    const context = useContext(DragContext);
    if (context === undefined) {
        throw new Error('useDragContext must be used within a DragProvider');
    }
    return context;
};