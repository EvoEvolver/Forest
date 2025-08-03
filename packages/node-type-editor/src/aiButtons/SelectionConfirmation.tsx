import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';

interface SelectionItem {
    id: string;
    title: string;
    content: string;
}

interface SelectionConfirmationProps {
    open: boolean;
    onClose: () => void;
    onAccept: () => void;
    dialogTitle: string;
    selectionItems: SelectionItem[];
    selectedItems: Record<string, boolean>;
    onToggleSelection: (id: string) => void;
}

export const SelectionConfirmation: React.FC<SelectionConfirmationProps> = ({
    open,
    onClose,
    onAccept,
    dialogTitle,
    selectionItems,
    selectedItems,
    onToggleSelection
}) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogContent>
                <p>Select the new children nodes you want to create:</p>
                <FormGroup>
                    {selectionItems.map((item) => (
                        <div key={item.id} style={{marginBottom: 16}}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={selectedItems[item.id] ?? true}
                                        onChange={() => onToggleSelection(item.id)}
                                    />
                                }
                                label={item.title}
                            />
                            <div
                                style={{marginLeft: 32, color: "#555"}}
                                dangerouslySetInnerHTML={{__html: item.content}}
                            />
                        </div>
                    ))}
                </FormGroup>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={onAccept} color="primary">Accept</Button>
            </DialogActions>
        </Dialog>
    );
};