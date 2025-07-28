/**
 * UserPanelModal - A floating modal version of UserPanel
 * Allows users to access their account without page reload
 */

import React from 'react';
import {
    Dialog,
    DialogContent,
    IconButton,
    Box,
    useMediaQuery,
    useTheme,
    Slide
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { TransitionProps } from '@mui/material/transitions';
import { UserPanel } from './UserPanel';

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement<any, any>;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface UserPanelModalProps {
    open: boolean;
    onClose: () => void;
}

export const UserPanelModal: React.FC<UserPanelModalProps> = ({ open, onClose }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Dialog
            open={open}
            onClose={onClose}
            TransitionComponent={Transition}
            maxWidth={false}
            fullScreen={isMobile}
            sx={{
                '& .MuiDialog-paper': {
                    width: isMobile ? '100%' : '90vw',
                    height: isMobile ? '100%' : '90vh',
                    maxWidth: isMobile ? '100%' : '1400px',
                    maxHeight: isMobile ? '100%' : '900px',
                    borderRadius: isMobile ? 0 : 2,
                    position: 'relative',
                    overflow: 'hidden'
                }
            }}
        >
            {/* Close Button */}
            <IconButton
                onClick={onClose}
                sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 1000,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 1)',
                    },
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                size="large"
            >
                <CloseIcon />
            </IconButton>

            {/* Modal Content */}
            <DialogContent
                sx={{
                    padding: 0,
                    height: '100%',
                    overflow: 'hidden',
                    backgroundColor: '#f5f5f5'
                }}
            >
                <Box
                    sx={{
                        height: '100%',
                        overflow: 'auto',
                        '&::-webkit-scrollbar': {
                            width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: 'rgba(0,0,0,0.1)',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                            background: 'rgba(0,0,0,0.4)',
                        },
                    }}
                >
                    {/* Render UserPanel without the height constraint */}
                    <Box sx={{ minHeight: '100%' }}>
                        <UserPanel />
                    </Box>
                </Box>
            </DialogContent>
        </Dialog>
    );
};