import React, {useState} from "react";
import {NodeVM} from "@forest/schema";
import {
    Button,
    Card,
    CardContent,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography
} from "@mui/material";
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import {AgentToolNodeTypeM} from "../ToolNode";

interface BearerTokenManageButtonProps {
    node: NodeVM;
}

export const BearerTokenManageButton: React.FC<BearerTokenManageButtonProps> = ({node}) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [tokenInput, setTokenInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const maskToken = (token: string): string => {
        if (!token || token.length <= 8) {
            return token ? "****" : "";
        }
        const firstFour = token.substring(0, 4);
        const lastFour = token.substring(token.length - 4);
        const middleLength = Math.max(4, token.length - 8);
        const middle = "*".repeat(middleLength);
        return `${firstFour}${middle}${lastFour}`;
    };

    const getExistingToken = (): string => {
        try {
            return AgentToolNodeTypeM.getBearerToken(node.nodeM) || "";
        } catch (error) {
            console.warn("Error accessing bearer token:", error);
            return "";
        }
    };

    const handleClick = () => {
        setError("");
        setTokenInput("");
        setDialogOpen(true);
    };

    const handleClose = () => {
        setDialogOpen(false);
        setTokenInput("");
        setError("");
    };

    const handleSave = async () => {
        setError("");
        
        if (!tokenInput.trim()) {
            setError("Token cannot be empty");
            return;
        }

        setLoading(true);
        try {
            const trimmedToken = tokenInput.trim();
            AgentToolNodeTypeM.updateBearerToken(node.nodeM, trimmedToken);
            handleClose();
        } catch (error) {
            setError("Error saving token: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        setError("");
        setLoading(true);
        
        try {
            AgentToolNodeTypeM.clearBearerToken(node.nodeM);
            handleClose();
        } catch (error) {
            setError("Error clearing token: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    const existingToken = getExistingToken();
    const hasToken = Boolean(existingToken);

    return (
        <>
            <Card
                sx={{
                    cursor: 'pointer',
                    boxShadow: 2,
                    '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-1px)'
                    },
                    transition: 'all 0.2s ease-in-out',
                    mb: 2,
                    borderRadius: 2
                }}
                onClick={handleClick}
            >
                <CardContent sx={{display: 'flex', alignItems: 'center', gap: 2, py: 1.5}}>
                    <VpnKeyIcon color="primary" fontSize="small"/>
                    <div>
                        <Typography variant="body2" component="div">
                            Manage Authentication
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            Configure bearer token for API authentication
                        </Typography>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
                <DialogTitle>Manage Authentication</DialogTitle>
                <DialogContent>
                    {hasToken && (
                        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                            Current token: <code>{maskToken(existingToken)}</code>
                        </Typography>
                    )}

                    <TextField
                        autoFocus
                        margin="dense"
                        label="Bearer Token"
                        fullWidth
                        variant="outlined"
                        type="password"
                        value={tokenInput}
                        onChange={(e) => {
                            setTokenInput(e.target.value);
                            if (error) setError("");
                        }}
                        placeholder="Enter your bearer token"
                        helperText={error || "This token will be used for authenticated API calls"}
                        error={Boolean(error)}
                    />
                </DialogContent>
                <DialogActions>
                    {hasToken && (
                        <Button
                            onClick={handleClear}
                            color="warning"
                            disabled={loading}
                            sx={{ mr: 'auto' }}
                        >
                            {loading ? <CircularProgress size={20}/> : "Clear Token"}
                        </Button>
                    )}
                    <Button onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        color="primary"
                        disabled={!tokenInput.trim() || loading}
                    >
                        {loading ? <CircularProgress size={20}/> : "Save"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};