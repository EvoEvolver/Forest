import React, {useEffect, useState} from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    Tooltip
} from '@mui/material';
import {useTheme} from '@mui/system';
import {useSetAtom} from 'jotai';
import AddIcon from '@mui/icons-material/Add';
import {addNewNodeAtom} from '../TreeState/TreeState';
import {NodeVM} from '@forest/schema';

interface childTypesForDisplay {
    name: string;
    displayName: string;
}

interface HoverPlusButtonProps {
    node: NodeVM;
    parentNode: NodeVM;
    isVisible: boolean;
    position: 'bottom' | 'top';
}

export const HoverPlusButton = ({node, parentNode, isVisible, position}: HoverPlusButtonProps) => {
    const theme = useTheme();
    const [dialogOpen, setDialogOpen] = useState(false);
    const addNewNode = useSetAtom(addNewNodeAtom);
    const [availableTypesForDisplay, setAvailableTypesForDisplay] = useState<childTypesForDisplay[]>([]);

    const availableTypeNames = parentNode.nodeType.allowedChildrenTypes;

    useEffect(() => {
        const fetchTypes = async () => {
            const promises = availableTypeNames.map(async (typeName) => {
                const nodeType = parentNode.treeVM.treeM.supportedNodeTypesM(typeName);
                return {
                    name: typeName,
                    displayName: nodeType.displayName
                };
            });
            const availableTypes = await Promise.all(promises);
            setAvailableTypesForDisplay(availableTypes);
        };
        fetchTypes();
    }, [availableTypeNames, parentNode.treeVM]);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();

        if (availableTypesForDisplay.length === 1) {
            handleAdd(availableTypesForDisplay[0].name);
            return;
        }

        setDialogOpen(true);
    };

    const handleClose = () => {
        setDialogOpen(false);
    };

    const handleAdd = (nodeTypeName: string) => {
        addNewNode({
            parentId: parentNode.id,
            positionId: node.id,
            nodeTypeName
        });

        handleClose();
    };

    if (!isVisible || !parentNode.nodeType.allowAddingChildren) {
        return null;
    }

    return (
        <>
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    [position]: '-16px',
                    zIndex: 1000,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '32px',
                    height: '32px'
                }}
            >
                <Tooltip title="Add Sibling" placement={position === 'bottom' ? 'top' : 'bottom'}>
                    <IconButton
                        size="small"
                        onClick={handleClick}
                        sx={{
                            backgroundColor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            color: theme.palette.primary.main,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            '&:hover': {
                                backgroundColor: theme.palette.primary.main + '20',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            }
                        }}
                    >
                        <AddIcon fontSize="small"/>
                    </IconButton>
                </Tooltip>
            </div>

            <Dialog
                open={dialogOpen}
                onClose={handleClose}
            >
                <DialogTitle>Choose Sibling Type</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Select the type of sibling node to add:
                    </DialogContentText>
                    {availableTypesForDisplay.map((type) => (
                        <Button
                            key={type.name}
                            fullWidth
                            variant="outlined"
                            onClick={() => handleAdd(type.name)}
                            sx={{mb: 1, justifyContent: 'flex-start'}}
                        >
                            {type.displayName}
                        </Button>
                    ))}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="primary">
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};