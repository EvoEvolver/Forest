import React, {useEffect} from 'react';
import {useAtomValue} from 'jotai'
import {Avatar, Box, Grid2 as Grid, Typography} from '@mui/material';
import {authTokenAtom, subscriptionAtom, userAtom} from "./authStates";
import {UserTreesList} from './UserTreesList';
import {useAtom} from "jotai/index";
import {VisitedTreesList} from './VisitedTreesList';
import DashboardCard from './DashboardCard';

export const UserPanel = ({}) => {
    const [, setSubscription] = useAtom(subscriptionAtom);
    const user = useAtomValue(userAtom)

    useEffect(() => {
        setSubscription()
    }, []);

    return (
        <Box
            sx={{
                margin: 'auto',
                maxWidth: 1200,
                width: '100vw',
                padding: "20px"
            }}
        >
            <Grid container spacing={3}>
                {/* User Profile Section */}
                <Grid
                    size={{
                        xs: 12,
                        lg: 4
                    }}
                >
                    <DashboardCard title="Profile">
                        <Box sx={{ textAlign: 'center', py: 2 }}>
                            <Avatar
                                sx={{ width: 80, height: 80, margin: '0 auto 16px' }}
                                alt="User Avatar"
                            />
                            <Typography variant="h5" component="div" gutterBottom>
                                {user?.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                {user?.email}
                            </Typography>
                        </Box>
                    </DashboardCard>
                </Grid>

                {/* Quick Actions Section */}
                <Grid
                    size={{
                        xs: 12,
                        lg: 8
                    }}
                >
                    <Grid container spacing={3}>
                        <Grid size={12}>
                            <VisitedTreesList/>
                        </Grid>
                    </Grid>
                </Grid>

                {/* Main Trees List */}
                <Grid
                    size={{
                        xs: 12
                    }}
                >
                    <UserTreesList/>
                </Grid>
            </Grid>
        </Box>
    );
};