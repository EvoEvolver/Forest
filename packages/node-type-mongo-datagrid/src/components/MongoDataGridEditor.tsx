import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DataGrid, GridColDef, GridRowsProp, GridRowModel, GridRowModesModel, GridEventListener, GridRowEditStopReasons, useGridApiRef } from '@mui/x-data-grid';
import { Box, Typography, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { NodeVM } from "@forest/schema";
import { httpUrl } from "@forest/schema/src/config";
import { CustomGridToolbar } from './CustomGridToolbar';
import { AddRowModal } from './AddRowModal';
import { AddColumnModal } from './AddColumnModal';
import { EditableColumnHeader } from './EditableColumnHeader';
import { CustomColumnMenu } from './CustomColumnMenu';
import { getFieldTypeFromSchema, isFieldEditable } from '../utils/fieldTypeDetection';
import { YjsProviderAtom } from "@forest/client/src/TreeState/YjsConnection";
import { useAtomValue } from 'jotai';
import { WebsocketProvider } from '@forest/schema/src/y-websocket';
import * as Y from 'yjs';

export interface MongoDocument {
    _id: string;
    [key: string]: any;
}

interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
}

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

interface MongoDataGridEditorProps {
    node: NodeVM;
    collectionName: string;
    readonly?: boolean;
}

export const MongoDataGridEditor: React.FC<MongoDataGridEditorProps> = ({
                                                                            node,
                                                                            collectionName,
                                                                            readonly = false
                                                                        }) => {
    const [documents, setDocuments] = useState<MongoDocument[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
    const [schema, setSchema] = useState<Record<string, string> | null>(null);
    const [rowSelectionModel, setRowSelectionModel] = useState<string[]>([]);

    // Modal state
    const [addRowModalOpen, setAddRowModalOpen] = useState(false);
    const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);

    // Column editing state
    const [editingColumnField, setEditingColumnField] = useState<string | null>(null);
    const [removeColumnField, setRemoveColumnField] = useState<string | null>(null);
    const [removingColumn, setRemovingColumn] = useState(false);

    // Toast notification state
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info'>('success');

    // Collection commit tracking state
    const [lastKnownCommit, setLastKnownCommit] = useState<number>(0);
    const lastKnownCommitRef = useRef<number>(0);
    
    const apiRef = useGridApiRef();
    const yjsProvider = useAtomValue(YjsProviderAtom);

    useEffect(() => {
        if (collectionName) {
            loadDocuments();
            loadSchema();
        }
    }, [collectionName, page, pageSize]);

    // Collection commit observer - watches for changes from other editors
    useEffect(() => {
        if (!collectionName || !yjsProvider) {
            return;
        }

        try {
            // Create a separate Y.js document connection for collection commits
            // This connects to the same document name that the server-side CollectionCommitManager uses
            const commitsDoc = new Y.Doc();
            
            // Extract the base WebSocket URL (remove any existing document path)
            const baseWsUrl = yjsProvider.url.replace(/\/[^\/]*$/, '');
            
            const commitsProvider = new WebsocketProvider(
                baseWsUrl, 
                'collection_commits', // This matches CollectionCommitManager.COMMITS_DOC_NAME
                commitsDoc
            );

            // Set up cleanup function immediately to handle React StrictMode double execution
            const cleanup = () => {
                commitsProvider.destroy();
                commitsDoc.destroy();
            };

            commitsProvider.on('sync', (isSynced) => {
                if (!isSynced) return;

                const commitsMap = commitsDoc.getMap('commits');
                
                // Initialize current commit number
                const currentCommit = commitsMap.get(collectionName) || 0;
                setLastKnownCommit(currentCommit);
                lastKnownCommitRef.current = currentCommit;

                // Set up observer for commit changes
                const observer = (event, transaction) => {
                    // Only observe changes from remote (not local changes)
                    if (transaction.local) return;
                    
                    if (event.target === commitsMap) {
                        // Check if our collection was modified
                        if (event.keys.has(collectionName)) {
                            const newCommit = commitsMap.get(collectionName) || 0;
                            
                            if (newCommit > lastKnownCommitRef.current) {
                                setLastKnownCommit(newCommit);
                                lastKnownCommitRef.current = newCommit;
                                
                                // Refresh the DataGrid to show changes from other editors
                                console.log("reloading document on commit number update");
                                loadDocuments();
                                loadSchema();
                            }
                        }
                    }
                };

                commitsMap.observe(observer);
            });

            // Return cleanup function (available immediately)
            return cleanup;

        } catch (error) {
            console.warn('Failed to set up collection commit observer:', error);
            return () => {}; // Return empty cleanup on error
        }
    }, [collectionName, yjsProvider]);

    const loadDocuments = async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: (page + 1).toString(),
                limit: pageSize.toString()
            });

            const response = await fetch(`${httpUrl}/api/collections/${collectionName}?${params}`);
            const result: ApiResponse<PaginatedResult<MongoDocument>> = await response.json();

            if (result.success && result.data) {
                setDocuments(result.data.data);
                setTotalCount(result.data.total);
            } else {
                setError(result.error || 'Failed to load documents');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const loadSchema = async () => {
        try {
            const response = await fetch(`${httpUrl}/api/collections/${collectionName}/schema`);
            const result = await response.json();

            if (result.success && result.data) {
                let schemaToUse: Record<string, string> | null = null;

                // Prefer JSON Schema if it exists, fallback to inferred schema
                if (result.data.jsonSchema) {
                    schemaToUse = extractFieldsFromJsonSchema(result.data.jsonSchema);
                } else if (result.data.inferredSchema) {
                    schemaToUse = result.data.inferredSchema;
                }

                setSchema(schemaToUse);
            }
        } catch (err) {
            console.error('Error loading schema:', err);
        }
    };

    const extractFieldsFromJsonSchema = (jsonSchema: any): Record<string, string> => {
        const fields: Record<string, string> = {};

        let schemaProperties;
        if (jsonSchema && jsonSchema.$jsonSchema && jsonSchema.$jsonSchema.properties) {
            schemaProperties = jsonSchema.$jsonSchema.properties;
        } else if (jsonSchema && jsonSchema.properties) {
            schemaProperties = jsonSchema.properties;
        }

        if (schemaProperties) {
            Object.entries(schemaProperties).forEach(([field, definition]: [string, any]) => {
                if (definition.bsonType) {
                    const bsonType = Array.isArray(definition.bsonType) ? definition.bsonType[0] : definition.bsonType;
                    switch (bsonType) {
                        case 'string':
                            fields[field] = 'string';
                            break;
                        case 'int':
                        case 'long':
                        case 'double':
                            fields[field] = 'number';
                            break;
                        case 'bool':
                            fields[field] = 'boolean';
                            break;
                        case 'date':
                            fields[field] = 'date';
                            break;
                        case 'objectId':
                            fields[field] = 'objectId';
                            break;
                        default:
                            fields[field] = 'string';
                    }
                }
            });
        }

        return fields;
    };

    const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel): Promise<GridRowModel> => {
        if (readonly) {
            showToast('Grid is in read-only mode', 'error');
            return oldRow;
        }

        // Check if the row has actually changed (excluding the DataGrid's 'id' field)
        const { id: newId, ...newRowData } = newRow;
        const { id: oldId, ...oldRowData } = oldRow;
        
        const hasChanged = JSON.stringify(newRowData) !== JSON.stringify(oldRowData);
        
        if (!hasChanged) {
            // No changes detected, return the old row without making API call
            return oldRow;
        }

        try {
            // Remove the DataGrid's 'id' field before sending to backend
            const { id, ...documentToUpdate } = newRow;
            
            const response = await fetch(`${httpUrl}/api/collections/${collectionName}/${newRow._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(documentToUpdate),
            });

            const result: ApiResponse<MongoDocument> = await response.json();

            if (result.success && result.data) {
                showToast('Document updated successfully', 'success');

                // Update the local documents state to reflect the change
                setDocuments(prevDocs =>
                    prevDocs.map(doc =>
                        doc._id === result.data._id ? result.data : doc
                    )
                );

                // Return the updated document with the 'id' field for DataGrid
                return { ...result.data, id: result.data._id };
            } else {
                showToast(result.error || 'Failed to update document', 'error');
                return oldRow;
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unknown error', 'error');
            return oldRow;
        }
    };

    const handleProcessRowUpdateError = (error: Error) => {
        showToast(error.message, 'error');
    };

    const showToast = (message: string, severity: 'success' | 'error' | 'info') => {
        setToastMessage(message);
        setToastSeverity(severity);
        setToastOpen(true);
    };

    const handleToastClose = () => {
        setToastOpen(false);
    };

    const handleAddRow = async (document: Partial<MongoDocument>) => {
        if (readonly) {
            showToast('Grid is in read-only mode', 'error');
            return;
        }

        try {
            const response = await fetch(`${httpUrl}/api/collections/${collectionName}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(document),
            });

            const result: ApiResponse<MongoDocument> = await response.json();

            if (result.success && result.data) {
                showToast('Document added successfully', 'success');
                // Refresh the grid to show the new document
                await loadDocuments();
            } else {
                showToast(result.error || 'Failed to add document', 'error');
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unknown error', 'error');
        }
    };

    const handleAddColumn = async (fieldName: string, fieldType: string, defaultValue: string) => {
        if (readonly) {
            showToast('Grid is in read-only mode', 'error');
            return;
        }

        try {
            const response = await fetch(`${httpUrl}/api/collections/${collectionName}/add-field`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fieldName,
                    fieldType,
                    defaultValue: defaultValue || null,
                }),
            });

            const result: ApiResponse = await response.json();

            if (result.success) {
                showToast(`Field '${fieldName}' added successfully`, 'success');
                // Refresh the grid and schema to show the new column
                await Promise.all([loadDocuments(), loadSchema()]);
            } else {
                showToast(result.error || 'Failed to add field', 'error');
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unknown error', 'error');
        }
    };

    const handleDeleteRows = async () => {
        if (readonly) {
            showToast('Grid is in read-only mode', 'error');
            return;
        }

        if (rowSelectionModel.length === 0) {
            showToast('No rows selected', 'info');
            return;
        }

        try {
            const deletePromises = rowSelectionModel.map(id =>
                fetch(`${httpUrl}/api/collections/${collectionName}/${id}`, {
                    method: 'DELETE',
                })
            );

            const responses = await Promise.all(deletePromises);
            const results = await Promise.all(responses.map(r => r.json()));

            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            if (successCount > 0) {
                showToast(`${successCount} document${successCount > 1 ? 's' : ''} deleted successfully`, 'success');
                setRowSelectionModel([]);
                await loadDocuments();
            }

            if (failCount > 0) {
                showToast(`Failed to delete ${failCount} document${failCount > 1 ? 's' : ''}`, 'error');
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unknown error', 'error');
        }
    };

    // Get existing field names for the AddColumnModal
    const existingFields = useMemo(() => {
        const fieldSet = new Set<string>();

        if (schema) {
            Object.keys(schema).forEach(field => fieldSet.add(field));
        }

        documents.forEach(doc => {
            Object.keys(doc).forEach(field => fieldSet.add(field));
        });

        return Array.from(fieldSet);
    }, [documents, schema]);

    const handleStartRenameColumn = (field: string) => {
        setEditingColumnField(field);
    };

    const handleCancelRenameColumn = () => {
        setEditingColumnField(null);
    };

    const handleRenameColumn = async (oldFieldName: string, newFieldName: string) => {
        if (readonly) {
            showToast('Grid is in read-only mode', 'error');
            return;
        }

        try {
            const response = await fetch(`${httpUrl}/api/collections/${collectionName}/fields/${oldFieldName}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newFieldName
                }),
            });

            const result: ApiResponse<{ modifiedCount: number }> = await response.json();

            if (result.success) {
                showToast(`Column renamed from "${oldFieldName}" to "${newFieldName}" successfully! ${result.data?.modifiedCount || 0} documents updated.`, 'success');
                setEditingColumnField(null);

                // Update local state immediately to prevent duplicate columns
                setDocuments(prevDocs =>
                    prevDocs.map(doc => {
                        if (doc.hasOwnProperty(oldFieldName)) {
                            const { [oldFieldName]: value, ...rest } = doc;
                            return { ...rest, [newFieldName]: value };
                        }
                        return doc;
                    })
                );

                // Update schema state immediately
                if (schema && schema[oldFieldName] !== undefined) {
                    const updatedSchema = { ...schema };
                    updatedSchema[newFieldName] = updatedSchema[oldFieldName];
                    delete updatedSchema[oldFieldName];
                    setSchema(updatedSchema);
                }

                // Refresh from server to ensure consistency
                await Promise.all([loadDocuments(), loadSchema()]);
            } else {
                showToast(result.error || 'Failed to rename column', 'error');
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unknown error', 'error');
        }
    };

    const handleRemoveColumn = (field: string) => {
        setRemoveColumnField(field);
    };

    const confirmRemoveColumn = async () => {
        if (!removeColumnField) return;
        setRemovingColumn(true);

        try {
            const response = await fetch(`${httpUrl}/api/collections/${collectionName}/fields/${removeColumnField}`, {
                method: 'DELETE',
            });

            const result: ApiResponse<{ modifiedCount: number }> = await response.json();

            if (result.success) {
                showToast(`Column "${removeColumnField}" removed successfully! ${result.data?.modifiedCount || 0} documents updated.`, 'success');
                setRemoveColumnField(null);
                // Refresh the grid to show the changes
                await Promise.all([loadDocuments(), loadSchema()]);
            } else {
                showToast(result.error || 'Failed to remove column', 'error');
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Unknown error', 'error');
        } finally {
            setRemovingColumn(false);
        }
    };

    const cancelRemoveColumn = () => {
        setRemoveColumnField(null);
    };

    // Generate columns dynamically from documents and schema
    const columns: GridColDef[] = useMemo(() => {
        const fieldSet = new Set<string>();

        // Add fields from schema if available (including for empty collections)
        if (schema) {
            Object.keys(schema).forEach(field => fieldSet.add(field));
        }

        // Add fields from actual documents (but only if not already in schema)
        documents.forEach(doc => {
            Object.keys(doc).forEach(field => {
                // Skip the 'id' field that DataGrid adds automatically - only show MongoDB fields
                if (field !== 'id') {
                    fieldSet.add(field);
                }
            });
        });

        // If no schema and no documents, return empty columns array
        if (fieldSet.size === 0) return [];

        // Sort fields: _id first, then alphabetically
        const sortedFields = Array.from(fieldSet).sort((a, b) => {
            if (a === '_id') return -1;
            if (b === '_id') return 1;
            return a.localeCompare(b);
        });

        const cols: GridColDef[] = sortedFields.map(field => {
            const isIdField = field === '_id';
            const fieldType = getFieldTypeFromSchema(field, documents, schema || undefined);
            const editable = !readonly && isFieldEditable(field, fieldType);

            return {
                field,
                headerName: field,
                width: isIdField ? 200 : 150,
                editable,
                // Don't use hide property, use initialState instead
                type: fieldType === 'number' ? 'number' :
                    fieldType === 'boolean' ? 'boolean' :
                        fieldType === 'date' ? 'dateTime' : 'string',
                renderHeader: () => (
                    <EditableColumnHeader
                        field={field}
                        headerName={field}
                        isEditing={editingColumnField === field}
                        onRename={handleRenameColumn}
                        onCancelEdit={handleCancelRenameColumn}
                    />
                ),
                valueGetter: (value, row) => {
                    if (fieldType === 'date' && value) {
                        return new Date(value);
                    }
                    return value;
                },
                valueFormatter: (value: any) => {
                    if (fieldType === 'objectId' && value) {
                        return String(value);
                    }
                    if (fieldType === 'date' && value) {
                        return new Date(value).toLocaleString();
                    }
                    if (typeof value === 'object' && value !== null) {
                        return JSON.stringify(value);
                    }
                    return String(value || '');
                }
            };
        });

        return cols;
    }, [documents, schema, readonly, editingColumnField]);

    const rows: GridRowsProp = documents.map(doc => ({
        ...doc,
        id: doc._id, // DataGrid needs an 'id' field
    }));

    if (error) {
        return (
            <Alert severity="error" sx={{ m: 2 }}>
                {error}
            </Alert>
        );
    }

    return (
        <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 2, flexShrink: 0 }}>
                Collection: {collectionName}
            </Typography>

            <Box sx={{ height: 500, width: '100%' }}>
                <DataGrid
                    apiRef={apiRef}
                    rows={rows}
                    columns={columns}
                    loading={loading}
                    pageSizeOptions={[10, 25, 50, 100]}
                    paginationModel={{ page, pageSize }}
                    onPaginationModelChange={(model) => {
                        setPage(model.page);
                        setPageSize(model.pageSize);
                    }}
                    paginationMode="server"
                    rowCount={totalCount}
                    processRowUpdate={processRowUpdate}
                    onProcessRowUpdateError={handleProcessRowUpdateError}
                    rowModesModel={rowModesModel}
                    onRowModesModelChange={setRowModesModel}
                    checkboxSelection
                    rowSelectionModel={rowSelectionModel}
                    onRowSelectionModelChange={(newSelection) => setRowSelectionModel(newSelection as string[])}
                    initialState={{
                        columns: {
                            columnVisibilityModel: {
                                _id: false,
                            },
                        },
                    }}
                    slots={{
                        toolbar: CustomGridToolbar,
                        columnMenu: CustomColumnMenu,
                    }}
                    slotProps={{
                        toolbar: {
                            onAddRow: () => setAddRowModalOpen(true),
                            onAddColumn: () => setAddColumnModalOpen(true),
                            onDeleteRows: handleDeleteRows,
                            selectedRowCount: rowSelectionModel.length,
                            readonly: readonly,
                        } as any,
                        columnMenu: {
                            onRenameColumn: handleStartRenameColumn,
                            onRemoveColumn: handleRemoveColumn,
                            readonly: readonly,
                        } as any,
                    }}
                    sx={{
                        height: '100%',
                        '& .MuiDataGrid-cell': {
                            fontSize: '0.875rem',
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        },
                        '& .MuiDataGrid-columnHeader': {
                            fontSize: '0.875rem',
                            fontWeight: 600
                        },
                        '& .MuiDataGrid-cell--editable': {
                            backgroundColor: 'transparent'
                        },
                        '& .MuiDataGrid-footerContainer': {
                            minHeight: 76, // Increased footer height
                            padding: '12px 16px',
                            borderTop: '1px solid rgba(224, 224, 224, 1)',
                        }
                    }}
                />
            </Box>

            <AddRowModal
                open={addRowModalOpen}
                onClose={() => setAddRowModalOpen(false)}
                onSubmit={handleAddRow}
                existingDocuments={documents}
                schema={schema || undefined}
            />

            <AddColumnModal
                open={addColumnModalOpen}
                onClose={() => setAddColumnModalOpen(false)}
                onSubmit={handleAddColumn}
                existingFields={existingFields}
            />

            <Snackbar
                open={toastOpen}
                autoHideDuration={4000}
                onClose={handleToastClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleToastClose}
                    severity={toastSeverity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {toastMessage}
                </Alert>
            </Snackbar>

            {/* Delete Column Confirmation Dialog */}
            <Dialog open={!!removeColumnField} onClose={cancelRemoveColumn}>
                <DialogTitle>Remove Column</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to remove the column "{removeColumnField}" from all documents? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelRemoveColumn}>Cancel</Button>
                    <Button
                        onClick={confirmRemoveColumn}
                        color="error"
                        variant="contained"
                        disabled={removingColumn}
                    >
                        {removingColumn ? 'Removing...' : 'Remove Column'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};