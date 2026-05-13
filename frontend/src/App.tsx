import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import RequireAuth from './components/RequireAuth'
import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import BotPage from './pages/BotPage'
import DesignPage from './pages/DesignPage'
import ContactPage from './pages/ContactPage'
import FAQPage, { FAQFormPage } from './pages/FAQPage'
import DocumentPage, { DocumentUploadPage } from './pages/DocumentPage'
import TestChatPage from './pages/TestChatPage'
import ConversationPage from './pages/ConversationPage'
import PublicChatPage from './pages/PublicChatPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/c/:slug" element={<PublicChatPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AdminLayout />}>
              <Route path="/app/bot" element={<BotPage />} />
              <Route path="/app/design" element={<DesignPage />} />
              <Route path="/app/contact" element={<ContactPage />} />
              <Route path="/app/faqs" element={<FAQPage />} />
              <Route path="/app/faqs/new" element={<FAQFormPage />} />
              <Route path="/app/faqs/:id/edit" element={<FAQFormPage />} />
              <Route path="/app/documents" element={<DocumentPage />} />
              <Route path="/app/documents/upload" element={<DocumentUploadPage />} />
              <Route path="/app/test-chat" element={<TestChatPage />} />
              <Route path="/app/conversations" element={<ConversationPage />} />
              <Route path="/app" element={<Navigate to="/app/bot" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
