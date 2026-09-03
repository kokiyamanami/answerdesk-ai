import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import RequireAuth from './components/RequireAuth'
import RequireBot from './components/RequireBot'
import AdminLayout from './components/AdminLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import BotPage from './pages/BotPage'
import DesignPage from './pages/DesignPage'
import ContactPage from './pages/ContactPage'
import FAQPage, { FAQFormPage } from './pages/FAQPage'
import DocumentPage, { DocumentUploadPage } from './pages/DocumentPage'
import ConversationPage from './pages/ConversationPage'
import FormSubmissionsPage from './pages/FormSubmissionsPage'
import AccuracyTestPage from './pages/AccuracyTestPage'
import MembersPage from './pages/MembersPage'
import BotsHomePage from './pages/BotsHomePage'
import PublicChatPage from './pages/PublicChatPage'
import LandingPage from './pages/LandingPage'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/c/:slug" element={<PublicChatPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<AdminLayout />}>
              <Route path="/app" element={<BotsHomePage />} />
              <Route path="/app/bot" element={<BotPage />} />
              <Route element={<RequireBot />}>
                <Route path="/app/design" element={<DesignPage />} />
                <Route path="/app/contact" element={<ContactPage />} />
                <Route path="/app/faqs" element={<FAQPage />} />
                <Route path="/app/faqs/new" element={<FAQFormPage />} />
                <Route path="/app/faqs/:id/edit" element={<FAQFormPage />} />
                <Route path="/app/documents" element={<DocumentPage />} />
                <Route path="/app/documents/upload" element={<DocumentUploadPage />} />
                <Route path="/app/accuracy" element={<AccuracyTestPage />} />
                <Route path="/app/members" element={<MembersPage />} />
                <Route path="/app/conversations" element={<ConversationPage />} />
                <Route path="/app/form-submissions" element={<FormSubmissionsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
