import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import IssuePanel from './IssuePanel'
import React from 'react'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <IssuePanel/>
    </StrictMode>,
)
