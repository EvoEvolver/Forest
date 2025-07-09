import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import {Provider} from "jotai";
import { BrowserRouter, Routes, Route } from "react-router";
import AuthSuccessPage from "@forest/user-system/src/AuthSuccessPage";
import {UserPanel} from "@forest/user-panel/src/UserPanel";
import {IssuePanel} from "@forest/issue-tracker"
import TreeInvitePage from './treeInvitePage';
import {ThemeProvider} from "@mui/material/styles";
import {themeOptions} from "./theme";

const rootElement = document.getElementById('root');

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <BrowserRouter>
            <ThemeProvider theme={themeOptions}>
            <Provider>
                <React.StrictMode>
                    <Routes>
                        <Route path="/" element={<App />} />
                        <Route path="/auth-success" element={<AuthSuccessPage />} />
                        <Route path="/user" element={<UserPanel/>} />
                        <Route path="/issues" element={<IssuePanel/>} />
                        <Route path="/tree-invite" element={<TreeInvitePage />} />
                    </Routes>
                </React.StrictMode>
            </Provider>
            </ThemeProvider>
        </BrowserRouter>
    );
} else {
    console.error('Root element not found in the document');
}