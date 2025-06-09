import { createContext, useContext, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Notification from '../components/ui/notification'

const NotificationContext = createContext()

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState(null)

  const showNotification = ({ type = 'info', title, message, autoClose = true, duration = 5000 }) => {
    setNotification({
      type,
      title,
      message,
      autoClose,
      duration,
      isVisible: true
    })
  }

  const hideNotification = () => {
    setNotification(null)
  }

  // Convenience methods for different notification types
  const showSuccess = (message, title = 'Success') => {
    showNotification({ type: 'success', title, message })
  }

  const showWarning = (message, title = 'Warning') => {
    showNotification({ type: 'warning', title, message })
  }

  const showError = (message, title = 'Error') => {
    showNotification({ type: 'error', title, message })
  }

  const showInfo = (message, title = 'Information') => {
    showNotification({ type: 'info', title, message })
  }

  const value = {
    showNotification,
    showSuccess,
    showWarning,
    showError,
    showInfo,
    hideNotification
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {notification && (
          <Notification
            {...notification}
            onClose={hideNotification}
          />
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  )
}

export default NotificationProvider 