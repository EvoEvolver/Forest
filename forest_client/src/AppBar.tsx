import {AppBar, Button, Stack, Toolbar} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ArticleIcon from "@mui/icons-material/Article";
import {supabase} from "./supabase";
import AuthButton from "./UserSystem/AuthButton";
import React from "react";

export function getAppBar(setCurrentPage: (value: (((prevState: string) => string) | string)) => void, currentPage: string) {
    return <AppBar position="static">
        <Toolbar variant="dense">
            <Stack direction="row" spacing={2} sx={{flexGrow: 1}}>
                <Button
                    color="inherit"
                    onClick={() => setCurrentPage('tree')}
                    variant={currentPage === 'tree' ? 'outlined' : 'text'}
                >
                    <AccountTreeIcon/>
                </Button>
                <Button
                    color="inherit"
                    onClick={() => setCurrentPage('linear')}
                    variant={currentPage === 'second' ? 'outlined' : 'text'}
                >
                    <ArticleIcon/>
                </Button>
            </Stack>

            {/* Auth button in the top right */}
            {supabase && <AuthButton/>}
        </Toolbar>
    </AppBar>;
}