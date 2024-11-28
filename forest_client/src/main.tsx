import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import {Provider} from "jotai";

const rootElement = document.getElementById('root');

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <Provider>
            <React.StrictMode>
                <App/>
            </React.StrictMode></Provider>,
    );
} else {
    console.error('Root element not found in the document');
}