import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ApiProvider } from './contexts/ApiContext'

const root = document.getElementById('root')

if(!root)
  throw new Error("Root not found")

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <ApiProvider
        baseUrl="http://localhost:3000"
        onUnauthenticated={() => { window.location.replace('/login') }}
      >
        <App />
      </ApiProvider>
    </BrowserRouter>
  </StrictMode>,
)
