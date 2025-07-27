import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import LoginPage from './pages/LoginPage'
import MessagesPage from './pages/MessagesPage'
import TasksPage from './pages/TasksPage'
import TaskDetailPage from './pages/TaskDetailPage'
import EscalationsPage from './pages/EscalationsPage'
import FAQsPage from './pages/FAQsPage'
import PropertiesPage from './pages/PropertiesPage'
import ContactsPage from './pages/ContactsPage'
import PromptPage from './pages/PromptPage'
import SettingsPage from './pages/SettingsPage'
import SandboxPage from './pages/SandboxPage'
import Layout from './components/Layout'
import { NotificationProvider } from './contexts/NotificationContext'
import { useState } from 'react'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return (
      <NotificationProvider>
        <LoginPage onLogin={handleLogin} />
      </NotificationProvider>
    )
  }

  return (
    <NotificationProvider>
      <Router>
        <Layout onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={<Navigate to="/messages" replace />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="/sandbox" element={<SandboxPage />} />
            <Route path="/escalations" element={<EscalationsPage />} />
            <Route path="/faqs" element={<FAQsPage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/prompt" element={<PromptPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </Router>
    </NotificationProvider>
  )
}

export default App
