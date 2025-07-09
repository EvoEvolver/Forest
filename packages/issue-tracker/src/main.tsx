import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import IssuePanel from './IssuePanel'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <IssuePanel/>
    </StrictMode>,
)
