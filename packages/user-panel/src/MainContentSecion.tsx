import React from 'react';
import { Box } from '@mui/material';
import { UserTreesList } from './UserTreesList';
import { MyAssignedIssues } from './MyAssignedIssues';
import { AuthGuard } from './AuthGuard';
import { TabId } from './TopBar';
import { motion, AnimatePresence } from 'framer-motion';

interface MainContentSectionProps {
    tabId: TabId;
}

export const MainContentSection: React.FC<MainContentSectionProps> = ({ tabId }) => {
    return (
        <AuthGuard>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    minHeight: '400px',
                    gap: 2,
                    overflow: 'hidden'
                }}
            >
                <AnimatePresence mode="wait">
                    {tabId === 'trees' && (
                        <motion.div
                            key="trees"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', minHeight: 0 }}
                        >
                            <UserTreesList />
                        </motion.div>
                    )}

                    {tabId === 'issues' && (
                        <motion.div
                            key="issues"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.05 }}
                            style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', minHeight: 0 }}
                        >
                            <MyAssignedIssues />
                        </motion.div>
                    )}

                    {tabId === 'profile' && (
                        <motion.div
                            key="profile"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.05 }}
                            style={{
                                flex: '1 1 0',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'gray',
                                minHeight: 0
                            }}
                        >
                            Profile content goes here
                        </motion.div>
                    )}
                </AnimatePresence>
            </Box>
        </AuthGuard>
    );
};
