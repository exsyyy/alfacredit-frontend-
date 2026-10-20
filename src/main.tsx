import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { createMockCreditApi } from './api/mockCreditApi'
import { createHttpCreditApi } from './api/httpCreditApi'
import { createHttpAuthApi } from './api/httpAuthApi'
import './styles.css'

const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const auth = baseUrl ? createHttpAuthApi({ baseUrl, storage: window.sessionStorage }) : undefined
const api = auth
  ? createHttpCreditApi({ baseUrl, getToken: () => auth.current()?.accessToken ?? null })
  : createMockCreditApi({
      storage: window.localStorage,
      failCreate: import.meta.env.VITE_MOCK_ERROR === 'true',
    })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><App api={api} auth={auth} /></BrowserRouter></React.StrictMode>,
)
