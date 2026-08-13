import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './store/index.js'
import { config } from './config/env.js'
import App from './App.jsx'
import './styles/index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter basename={config.basePath === '/' ? undefined : config.basePath}>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
