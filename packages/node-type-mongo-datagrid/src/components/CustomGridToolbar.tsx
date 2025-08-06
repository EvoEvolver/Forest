import React from 'react';
import {
    GridToolbarColumnsButton,
    GridToolbarContainer,
    GridToolbarDensitySelector,
    GridToolbarFilterButton,
    GridToolbarProps,
} from '@mui/x-data-grid';
import {Box, Button} from '@mui/material';
import {Add as AddIcon, Delete as DeleteIcon, ViewColumn as ViewColumnIcon} from '@mui/icons-material';

interface CustomGridToolbarProps extends GridToolbarProps {
    onAddRow?: () => void;
    onAddColumn?: () => void;
    onDeleteRows?: () => void;
    selectedRowCount?: number;
    deletingRows?: boolean;
    readonly?: boolean;
}

export const CustomGridToolbar: React.FC<CustomGridToolbarProps> = ({
                                                                        onAddRow,
                                                                        onAddColumn,
                                                                        onDeleteRows,
                                                                        selectedRowCount = 0,
                                                                        deletingRows = false,
                                                                        readonly = false
                                                                    }) => {
    return (
        <GridToolbarContainer>
            <Box sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
                {!readonly && onAddRow && (
                    <Button
                        size="small"
                        startIcon={<AddIcon/>}
                        onClick={onAddRow}
                        variant="outlined"
                    >
                        Add Row
                    </Button>
                )}
                {!readonly && onAddColumn && (
                    <Button
                        size="small"
                        startIcon={<ViewColumnIcon/>}
                        onClick={onAddColumn}
                        variant="outlined"
                    >
                        Add Column
                    </Button>
                )}
                {!readonly && onDeleteRows && selectedRowCount > 0 && (
                    <Button
                        size="small"
                        startIcon={<DeleteIcon/>}
                        onClick={onDeleteRows}
                        variant="outlined"
                        color="error"
                        disabled={deletingRows}
                    >
                        Delete {selectedRowCount} Row{selectedRowCount > 1 ? 's' : ''}
                    </Button>
                )}
                <GridToolbarColumnsButton/>
                <GridToolbarFilterButton/>
                <GridToolbarDensitySelector/>
                {/* <GridToolbarExport />  TODO */}
            </Box>
        </GridToolbarContainer>
    );
};