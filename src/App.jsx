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
import { AuthProvider, useAuth } from './contexts/AuthContext'

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-purple to-brand-dark">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
        />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <Router>
      <Layout>
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
  )
}

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </NotificationProvider>
  )
}

export default App
