import React from 'react';
import {
    GridColumnMenuColumnsItem,
    GridColumnMenuContainer,
    GridColumnMenuFilterItem,
    GridColumnMenuProps,
    GridColumnMenuSortItem,
    useGridApiContext
} from '@mui/x-data-grid';
import {Divider, ListItemIcon, ListItemText, MenuItem} from '@mui/material';
import {Delete as DeleteIcon, Edit as EditIcon} from '@mui/icons-material';

interface CustomColumnMenuProps extends GridColumnMenuProps {
    onRenameColumn?: (field: string) => void;
    onRemoveColumn?: (field: string) => void;
    readonly?: boolean;
}

export const CustomColumnMenu: React.FC<CustomColumnMenuProps> = (props) => {
    const {onRenameColumn, onRemoveColumn, readonly = false, ...other} = props;
    const apiRef = useGridApiContext();

    const canRename = !readonly && props.colDef.field !== '_id' && onRenameColumn;
    const canRemove = !readonly && props.colDef.field !== '_id' && onRemoveColumn;

    const handleRename = () => {
        if (onRenameColumn) onRenameColumn(props.colDef.field);
        apiRef.current.hideColumnMenu();
    };

    const handleRemove = () => {
        if (onRemoveColumn) onRemoveColumn(props.colDef.field);
        apiRef.current.hideColumnMenu();
    };

    return (
        <GridColumnMenuContainer hideMenu={other.hideMenu} colDef={other.colDef} {...other}>
            <GridColumnMenuSortItem onClick={other.hideMenu} colDef={other.colDef}/>
            <GridColumnMenuFilterItem onClick={other.hideMenu} colDef={other.colDef}/>
            <Divider/>
            <GridColumnMenuColumnsItem onClick={other.hideMenu} colDef={other.colDef}/>

            {(canRename || canRemove) && <Divider/>}

            {canRename && (
                <MenuItem onClick={handleRename}>
                    <ListItemIcon>
                        <EditIcon fontSize="small"/>
                    </ListItemIcon>
                    <ListItemText>Rename Column</ListItemText>
                </MenuItem>
            )}

            {canRemove && (
                <MenuItem onClick={handleRemove}>
                    <ListItemIcon>
                        <DeleteIcon fontSize="small"/>
                    </ListItemIcon>
                    <ListItemText>Remove Column</ListItemText>
                </MenuItem>
            )}
        </GridColumnMenuContainer>
    );
};