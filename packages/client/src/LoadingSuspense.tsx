import {useTheme} from "@mui/system";
import {Box, CircularProgress, Fade, Typography} from "@mui/material";
import React from "react";

export const LoadingSuspense = () => {
    const theme = useTheme();

    return (
        <Fade in timeout={300}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    minHeight: '50vh',
                    gap: 2,
                    backgroundColor: theme.palette.background.default,
                }}
            >
                <CircularProgress
                    size={40}
                    thickness={4}
                    sx={{
                        color: theme.palette.primary.main,
                        animationDuration: '1.4s'
                    }}
                />
                <Typography
                    variant="body1"
                    sx={{
                        color: theme.palette.text.secondary,
                        fontWeight: 500
                    }}
                >
                    Loading...
                </Typography>
            </Box>
        </Fade>
    );
};