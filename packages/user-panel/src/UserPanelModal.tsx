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
                    top: 4,
                    right: 4,
                    zIndex: 1000,
                    backgroundColor: 'transparent',
                    backdropFilter: 'blur(4px)',
                }}
                size="large"
            >
                <CloseIcon />
            </IconButton>

            {/* Modal Content */}
            <DialogContent
                sx={{
                    padding: 1,
                    margin: 0,
                    height: '100%',
                    overflow: 'hidden',
                    backgroundColor: theme.palette.background.paper
                }}
            >

                {/* Render UserPanel with full height */}
                <Box sx={{ height: '100%', padding: 0}}>
                    <UserPanel />
                </Box>
            </DialogContent>
        </Dialog>
    );
};