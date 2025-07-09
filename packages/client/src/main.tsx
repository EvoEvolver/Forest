import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import {Provider} from "jotai";
import { BrowserRouter, Routes, Route } from "react-router";
import AuthSuccessPage from "@forest/user-system/src/AuthSuccessPage";
import {UserPanel} from "@forest/user-panel/src/UserPanel";
import {IssuePanel} from "@forest/issue-tracker"

const rootElement = document.getElementById('root');

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <BrowserRouter>
            <Provider>
                <React.StrictMode>
                    <Routes>
                        <Route path="/" element={<App />} />
                        <Route path="/auth-success" element={<AuthSuccessPage />} />
                        <Route path="/user" element={<UserPanel/>} />
                        <Route path="/issues" element={<IssuePanel/>} />
                    </Routes>
                </React.StrictMode>
            </Provider>
        </BrowserRouter>
    );
} else {
    console.error('Root element not found in the document');
}