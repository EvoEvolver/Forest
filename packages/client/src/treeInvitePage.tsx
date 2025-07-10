import React, {useEffect, useState} from 'react';
import {httpUrl} from './appState';
import {useAtom, useAtomValue} from 'jotai';
import {subscriptionAtom, supabaseClientAtom, userAtom} from '@forest/user-system/src/authStates';
import {AppBar, Toolbar, Container, Paper, Typography, Button, Alert, Box, CircularProgress} from "@mui/material";
import AuthButton from "@forest/user-system/src/AuthButton";
import AuthModal from "@forest/user-system/src/AuthModal";

const TreeInvitePage = () => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [subscription, setSubscription] = useAtom(subscriptionAtom);
    const supabaseClient = useAtomValue(supabaseClientAtom)
    const user = useAtomValue(userAtom);

    useEffect(() => {
        setSubscription();
        return () => {
            if (subscription) subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset status and message when user changes
    useEffect(() => {
        setStatus('idle');
        setMessage('');
    }, [user]);

    const handleGrantPermission = async () => {
        setStatus('loading');
        setMessage('');
        const params = new URLSearchParams(window.location.search);
        const treeId = params.get('treeId');
        const userId = user.id;
        if (!treeId || !userId) {
            setStatus('error');
            setMessage('Missing treeId or userId in URL.');
            return;
        }
        try {
            const res = await fetch(`${httpUrl}/api/tree-permission/grant`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({treeId, userId, permissionType: 'editor'}),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to grant permission');
            }
            setStatus('success');
            setMessage('Editor permission granted successfully! You can now edit this tree.');
        } catch (err) {
            setStatus('error');
            setMessage(err.message || 'Unknown error');
        }
    };

    // Extract treeId for display
    const params = new URLSearchParams(window.location.search);
    const treeId = params.get('treeId');

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar position="fixed">
                <Toolbar variant="dense">
                    {/* Fix linter error by wrapping AuthButton in a fragment */}
                    {supabaseClient && <>{<AuthButton/>}</>}
                </Toolbar>
            </AppBar>
            {supabaseClient && <AuthModal/>}
            <Container maxWidth="sm" sx={{ pt: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Paper elevation={3} sx={{ p: 4, mt: 4, width: '100%', maxWidth: 500, textAlign: 'center' }}>
                    <Typography variant="h4" gutterBottom color="primary">
                        Grant Editor Permission
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        This page allows you to accept an invitation to become an <b>editor</b> for a specific tree in Forest.
                        <br/>
                        By clicking the button below, you will be granted editor access to the tree.
                    </Typography>
                    {treeId && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            You are about to join tree: <b>{treeId}</b> as an editor.
                        </Alert>
                    )}
                    {!treeId && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            No treeId found in the URL. Please check your invitation link.
                        </Alert>
                    )}
                    {status === 'idle' && (
                        <Button
                            onClick={handleGrantPermission}
                            variant="contained"
                            color="primary"
                            size="large"
                            sx={{ mt: 2, mb: 1 }}
                            disabled={!treeId || !user?.id}
                        >
                            Grant Permission
                        </Button>
                    )}
                    {status === 'loading' && <Box sx={{ mt: 2, mb: 1 }}><CircularProgress size={28} /><Typography variant="body2" sx={{ mt: 1 }}>Granting permission...</Typography></Box>}
                    {status === 'success' && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
                    {status === 'error' && <Alert severity="error" sx={{ mt: 2 }}>{message}</Alert>}
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="caption" color="text.secondary">
                            If you have any issues, please contact the person who invited you or the Forest support team.
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default TreeInvitePage;
