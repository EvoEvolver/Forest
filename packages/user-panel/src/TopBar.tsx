import React from 'react';
import { Box, Button } from '@mui/material';

export type TabId = 'profile' | 'trees' | 'issues';

interface Tab {
    id: TabId;
    label: string;
}

interface TopBarProps {
    activeTab: TabId;
    setActiveTab: React.Dispatch<React.SetStateAction<TabId>>;
}

const TopBar: React.FC<TopBarProps> = ({ activeTab, setActiveTab }) => {
    const [hoveredTab, setHoveredTab] = React.useState<TabId | null>(null);

    const tabs: Tab[] = [
        { id: 'profile', label: 'Profile' },
        { id: 'trees', label: 'Trees' },
        { id: 'issues', label: 'Issues' }
    ];

    return (
        <Box sx={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* Main container */}
            <Box
                sx={{
                    position: 'relative',
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'transparent'
                }}
            >
                {/* Navigation */}
                <Box
                    sx={{
                        position: 'relative',
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                    }}
                >
                    {tabs.map((tab) => (
                        <Box key={tab.id} sx={{ position: 'relative' }}>
                            <Button
                                onClick={() => setActiveTab(tab.id)}
                                onMouseEnter={() => setHoveredTab(tab.id)}
                                onMouseLeave={() => setHoveredTab(null)}
                                sx={{
                                    textTransform: 'none',
                                    position: 'relative',
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 500,
                                    fontSize: '1.125rem',
                                    letterSpacing: '0.025em',
                                    transition: 'all 0.3s ease',
                                    transform:
                                        activeTab === tab.id ? 'scale(1.05)' : 'scale(1)',
                                    color: activeTab === tab.id ? 'gray.900' : 'gray.700',
                                    '&:hover': {
                                        color: 'gray.900'
                                    },
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        inset: 0,
                                        transform: 'skewX(-12deg)',
                                        transition: 'all 0.3s ease',
                                        backgroundColor:
                                            activeTab === tab.id
                                                ? 'rgba(0, 0, 0, 0.08)'
                                                : hoveredTab === tab.id
                                                    ? 'rgba(0, 0, 0, 0.04)'
                                                    : 'transparent',
                                        border:
                                            activeTab === tab.id
                                                ? '1px solid rgba(0, 0, 0, 0.1)'
                                                : 'none'
                                    },
                                    '&::after':
                                        activeTab === tab.id
                                            ? {
                                                content: '""',
                                                position: 'absolute',
                                                bottom: -4,
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: 48,
                                                height: 2,
                                                backgroundColor: 'rgba(0, 0, 0, 0.4)'
                                            }
                                            : {}
                                }}
                            >
                                <Box
                                    component="span"
                                    sx={{ position: 'relative', zIndex: 10 }}
                                >
                                    {tab.label}
                                </Box>
                            </Button>
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Subtle bottom border */}
            <Box
                sx={{ height: 1, backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
            />
        </Box>
    );
};

export default TopBar;
