import {AppBar, Button, Stack, Toolbar} from "@mui/material";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ArticleIcon from "@mui/icons-material/Article";
import AuthButton from "./UserSystem/AuthButton";
import React from "react";
import {useAtomValue} from "jotai";
import {supabaseClientAtom} from "./UserSystem/authStates";
import {YjsConnectionStatusAtom} from "./TreeState/YjsConnection";

export function getAppBar(setCurrentPage: (value: (((prevState: string) => string) | string)) => void, currentPage: string) {
    const connectionStatus = useAtomValue(YjsConnectionStatusAtom)
    const supabaseClient = useAtomValue(supabaseClientAtom)
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
            {connectionStatus !== 'connected' &&
                <span>
                {connectionStatus === 'connecting' ? 'Connecting...(version not saved)' : 'Disconnected'}
                </span>
            }
            {/* Auth button in the top right */}
            {supabaseClient && <AuthButton/>}
        </Toolbar>
    </AppBar>;
}