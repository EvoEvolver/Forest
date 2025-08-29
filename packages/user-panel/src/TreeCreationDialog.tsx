import React, {useEffect, useState} from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Tab,
    Tabs,
    Box,
    Typography,
    LinearProgress,
    Alert,
    Paper,
    CircularProgress
} from '@mui/material';
import {CloudUpload as CloudUploadIcon} from '@mui/icons-material';
import {v4 as uuidv4} from 'uuid';
import {useAtomValue} from 'jotai';
import {authTokenAtom} from '@forest/user-system/src/authStates';
import {NodeJson, TreeJson, TreeMetadata} from '@forest/schema';
import {supportedNodeTypesM} from '@forest/node-types/src/model';

const currentPort = (process.env.NODE_ENV || 'development') == 'development' ? "29999" : window.location.port;
const httpUrl = `${window.location.protocol}//${location.hostname}:${currentPort}`;

interface NodeTypeForDisplay {
    name: string;
    displayName: string;
}

interface TreeCreationDialogProps {
    open: boolean;
    onClose: () => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const {children, value, index, ...other} = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`creation-tabpanel-${index}`}
            aria-labelledby={`creation-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{pt: 3}}>{children}</Box>}
        </div>
    );
}

const SUPPORTED_FILE_TYPES = ['pdf', 'md', 'doc', 'docx', 'txt'];
const DOCUMENT_PROCESSING_URL = 'http://localhost:8081';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export const TreeCreationDialog: React.FC<TreeCreationDialogProps> = ({open, onClose}) => {
    const [availableNodeTypes, setAvailableNodeTypes] = useState<NodeTypeForDisplay[]>([]);
    const [tabValue, setTabValue] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const authToken = useAtomValue(authTokenAtom);

    useEffect(() => {
        const loadNodeTypes = async () => {
            const nodeTypeNames = [
                "EditorNodeType",
                "AgentNodeType"
            ];

            const promises = nodeTypeNames.map(async (typeName) => {
                try {
                    const nodeType = await supportedNodeTypesM(typeName);
                    return {
                        name: typeName,
                        displayName: nodeType?.displayName || typeName
                    };
                } catch (error) {
                    console.warn(`Failed to load node type ${typeName}:`, error);
                    return null;
                }
            });

            const nodeTypes = await Promise.all(promises);
            setAvailableNodeTypes(nodeTypes.filter(type => type !== null) as NodeTypeForDisplay[]);
        };

        void loadNodeTypes();
    }, []);

    const validateFileType = (file: File): boolean => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        return fileExtension ? SUPPORTED_FILE_TYPES.includes(fileExtension) : false;
    };

    const getFileTypeForApi = (file: File): string => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        return fileExtension === 'pdf' ? 'pdf' : 'document';
    };

    const getUserIdFromToken = (): string | null => {
        if (!authToken) return null;
        try {
            const payload = JSON.parse(atob(authToken.split('.')[1]));
            return payload.sub || null;
        } catch (e) {
            console.warn('Could not extract user ID from token:', e);
            return null;
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!validateFileType(file)) {
            setErrorMessage(`Unsupported file type. Supported formats: ${SUPPORTED_FILE_TYPES.join(', ')}`);
            return;
        }

        setErrorMessage(null);
        setUploadStatus('uploading');
        setUploadProgress(0);

        try {
            // Step 1: Upload file to Forest server (MinIO)
            console.log('Step 1: Uploading file to Forest server...');
            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch(`${httpUrl}/api/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.statusText}`);
            }

            const uploadData = await uploadResponse.json();
            if (!uploadData.success || !uploadData.fileUrl) {
                throw new Error(uploadData.error || 'Upload failed - no file URL returned');
            }

            const fileUrl = uploadData.fileUrl;
            console.log('Step 1 completed - File uploaded to:', fileUrl);

            // Step 2: Submit to document processing service
            console.log('Step 2: Submitting to document processing service...');
            setUploadStatus('processing');
            
            const userId = getUserIdFromToken();
            const processingPayload = {
                file_url: fileUrl,
                file_type: getFileTypeForApi(file),
                original_filename: file.name,
                ...(userId && { userid: userId })
            };

            const submitResponse = await fetch(`${DOCUMENT_PROCESSING_URL}/submit/document_to_tree`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(processingPayload)
            });

            if (!submitResponse.ok) {
                throw new Error(`Document processing failed: ${submitResponse.statusText}`);
            }

            const submitData = await submitResponse.json();
            const jobId = submitData.job_id;

            if (!jobId) {
                throw new Error('Document processing service did not return job ID');
            }

            console.log('Step 2 completed - Job ID:', jobId);

            // Step 3: Poll for results
            await pollForResults(jobId);

        } catch (error) {
            console.error('File upload error:', error);
            setUploadStatus('error');
            setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
        }
    };

    const pollForResults = async (jobId: string) => {
        const maxAttempts = 60; // 2 minutes with 2-second intervals
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                const resultResponse = await fetch(`${DOCUMENT_PROCESSING_URL}/result`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({job_id: jobId})
                });

                if (!resultResponse.ok) {
                    throw new Error('Unable to get processing results');
                }

                const resultData = await resultResponse.json();
                
                if (resultData.treeUrl) {
                    setUploadStatus('success');
                    // Extract tree ID from URL and redirect
                    const urlParts = resultData.treeUrl.split('id=');
                    if (urlParts.length > 1) {
                        const treeId = urlParts[1];
                        setTimeout(() => {
                            window.location.href = `${window.location.origin}/?id=${treeId}`;
                        }, 1000);
                    }
                    return;
                }

                if (resultData.status === 'ERROR' || resultData.status === 'FAILED') {
                    throw new Error(resultData.message || 'Document processing failed');
                }

                // Update progress
                setUploadProgress((attempts / maxAttempts) * 100);
                
            } catch (error) {
                console.error('Polling error:', error);
                setUploadStatus('error');
                setErrorMessage(error instanceof Error ? error.message : 'Processing failed');
                return;
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        setUploadStatus('error');
        setErrorMessage('Processing timeout, please try again');
    };

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragOver(false);
        
        const files = Array.from(event.dataTransfer.files) as File[];
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    };

    const handleDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (event: React.DragEvent) => {
        event.preventDefault();
        setIsDragOver(false);
    };

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            handleFileUpload(files[0]);
        }
        event.target.value = ''; // Reset input
    };

    const handleApiResponse = async (response: Response, _errorContext: string) => {
        if (!response.ok) {
            const status = response.status;
            if (status === 401) throw new Error("AUTHENTICATION_FAILED");
            if (status === 403) throw new Error("PERMISSION_DENIED");
            throw new Error(`HTTP_ERROR_${status}`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
    };

    const handleCreateTree = async (nodeTypeName: string = "EditorNodeType") => {
        const nodeId = uuidv4();
        const newRootJson: NodeJson = {
            title: "Root",
            children: [],
            id: nodeId,
            parent: null,
            data: {},
            nodeTypeName: nodeTypeName
        };
        const newTreeMetadata: TreeMetadata = {
            rootId: newRootJson.id
        };
        const newTreeJson: TreeJson = {
            nodeDict: {
                [nodeId]: newRootJson
            },
            metadata: newTreeMetadata
        };

        try {
            const data = await handleApiResponse(
                await fetch(httpUrl + "/api/createTree", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({"tree": newTreeJson})
                }),
                "create tree"
            );
            if (!data.tree_id) throw new Error("No tree_id returned from server");
            window.location.href = `${window.location.origin}/?id=${data.tree_id}`;

        } catch (error) {
            console.error("Error creating tree:", error);
            throw error;
        }
    };

    const handleSelectNodeType = (nodeTypeName: string) => {
        handleCreateTree(nodeTypeName);
        onClose();
    };

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
        setErrorMessage(null);
        setUploadStatus('idle');
    };

    const resetDialog = () => {
        setTabValue(0);
        setUploadStatus('idle');
        setUploadProgress(0);
        setErrorMessage(null);
        setIsDragOver(false);
    };

    const handleClose = () => {
        resetDialog();
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>Create New Tree</DialogTitle>
            <DialogContent>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="tree creation options">
                    <Tab label="Basic Types" />
                    <Tab label="Upload Document" />
                </Tabs>
                
                <TabPanel value={tabValue} index={0}>
                    <DialogContentText sx={{mb: 2}}>
                        Select the type of root node for your new tree:
                    </DialogContentText>
                    {availableNodeTypes.map((type) => (
                        <Button
                            key={type.name}
                            fullWidth
                            variant="outlined"
                            onClick={() => handleSelectNodeType(type.name)}
                            sx={{mb: 1, justifyContent: 'flex-start'}}
                            disabled={uploadStatus === 'processing'}
                        >
                            {type.displayName}
                        </Button>
                    ))}
                </TabPanel>
                
                <TabPanel value={tabValue} index={1}>
                    <DialogContentText sx={{mb: 2}}>
                        Upload a document to create a tree structure automatically.
                    </DialogContentText>
                    
                    {uploadStatus === 'idle' && (
                        <Paper
                            sx={{
                                border: '2px dashed',
                                borderColor: isDragOver ? 'primary.main' : 'grey.300',
                                bgcolor: isDragOver ? 'action.hover' : 'background.paper',
                                p: 4,
                                textAlign: 'center',
                                cursor: 'pointer',
                                '&:hover': {
                                    borderColor: 'primary.main',
                                    bgcolor: 'action.hover'
                                }
                            }}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                            <input
                                type="file"
                                accept=".pdf,.md,.doc,.docx,.txt"
                                onChange={handleFileInputChange}
                                style={{display: 'none'}}
                                id="file-input"
                            />
                            <label htmlFor="file-input" style={{cursor: 'pointer', display: 'block'}}>
                                <CloudUploadIcon sx={{fontSize: 48, color: 'text.secondary', mb: 1}} />
                                <Typography variant="h6" gutterBottom>
                                    Drag & drop your file here
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    or click to browse
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Supported formats: PDF, Markdown, DOC, DOCX, TXT
                                </Typography>
                            </label>
                        </Paper>
                    )}
                    
                    {uploadStatus === 'uploading' && (
                        <Paper sx={{p: 3, textAlign: 'center'}}>
                            <CircularProgress sx={{mb: 2}} />
                            <Typography>Uploading file to storage...</Typography>
                        </Paper>
                    )}
                    
                    {uploadStatus === 'processing' && (
                        <Paper sx={{p: 3}}>
                            <Typography variant="h6" gutterBottom>
                                Processing document...
                            </Typography>
                            <LinearProgress variant="determinate" value={uploadProgress} sx={{mb: 1}} />
                            <Typography variant="body2" color="text.secondary">
                                This may take a few moments depending on the document size.
                            </Typography>
                        </Paper>
                    )}
                    
                    {uploadStatus === 'success' && (
                        <Alert severity="success">
                            Document processed successfully! Redirecting to your new tree...
                        </Alert>
                    )}
                    
                    {uploadStatus === 'error' && errorMessage && (
                        <Alert severity="error" sx={{mb: 2}}>
                            {errorMessage}
                        </Alert>
                    )}
                </TabPanel>
            </DialogContent>
            
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
                {uploadStatus === 'error' && (
                    <Button 
                        onClick={() => {
                            setUploadStatus('idle');
                            setErrorMessage(null);
                        }} 
                        color="primary" 
                        variant="outlined"
                    >
                        Try Again
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};