import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import {Provider} from "jotai";
import { BrowserRouter, Routes, Route } from "react-router";
import AuthSuccessPage from "./UserSystem/AuthSuccessPage";
import {UserPanel} from "./UserSystem/UserPanel";

const rootElement = document.getElementById('root');

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <BrowserRouter>
            <Provider>
                <React.StrictMode>
                    <Routes>
                        <Route path="/" element={<App />} />
                        <Route path="/auth-success" element={<AuthSuccessPage />} />
                        <Route path="user" element={<UserPanel/>} />
                    </Routes>
                </React.StrictMode>
            </Provider>
        </BrowserRouter>
    );
} else {
    console.error('Root element not found in the document');
}