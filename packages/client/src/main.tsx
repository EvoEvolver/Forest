import React, {lazy, Suspense, useMemo} from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {Provider, useAtom} from "jotai";
import { BrowserRouter, Routes, Route } from "react-router";
import {ThemeProvider} from "@mui/material/styles";
import {createAppTheme, themeModeAtom} from "./theme";
import {CssBaseline} from "@mui/material";

// Lazy load all route components
// @ts-ignore
const App = lazy(() => import('./App'));
// @ts-ignore
const AuthSuccessPage = lazy(() => import('@forest/user-system/src/AuthSuccessPage'));
// @ts-ignore
const UserPanelPage = lazy(() => import('@forest/user-panel/src/UserPanelPage').then(module => ({ default: module.UserPanelPage })));
const IssuePanel = lazy(() => import('@forest/issue-tracker').then(module => ({ default: module.IssuePanel })));
// @ts-ignore
const TreeInvitePage = lazy(() => import('./treeInvitePage'));

function Root() {
    const [mode] = useAtom(themeModeAtom);
    const isDevMode = process.env.NODE_ENV === 'development';

    const theme = useMemo(() => createAppTheme(mode, isDevMode), [mode, isDevMode]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <React.StrictMode>
                <Suspense fallback={<div>Loading...</div>}>
                    <Routes>
                        <Route path="/" element={<App />} />
                        <Route path="/auth-success" element={<AuthSuccessPage />} />
                        <Route path="/user" element={<UserPanelPage />} />
                        <Route path="/issues" element={<IssuePanel />} />
                        <Route path="/tree-invite" element={<TreeInvitePage />} />
                    </Routes>
                </Suspense>
            </React.StrictMode>
        </ThemeProvider>
    );
}

const rootElement = document.getElementById('root');

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <Provider>
            <BrowserRouter>
                <Root />
            </BrowserRouter>
        </Provider>
    );
} else {
    console.error('Root element not found in the document');
}