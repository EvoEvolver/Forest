import React from 'react';
import {Box, Card, CardContent, Typography, Avatar, Stack, Button, Paper} from '@mui/material';

export const UserPanel = () => {
    return (
        <Paper
            sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <Card sx={{ maxWidth: 345, m: 2 }}>
                <CardContent>
                    <Stack spacing={2} alignItems="center">
                        <Avatar
                            sx={{ width: 64, height: 64 }}
                            alt="User Avatar"
                        />

                        <Typography variant="h6" component="div">
                            John Doe
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                            john.doe@example.com
                        </Typography>
                    </Stack>
                </CardContent>
            </Card>
        </Paper>
    );
};