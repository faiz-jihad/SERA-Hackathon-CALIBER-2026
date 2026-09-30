import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from '@/context/LanguageContext'
import { AuthProvider } from '@/context/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import ErrorBoundary from '@/components/ErrorBoundary'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import EquipmentListPage from '@/pages/EquipmentListPage'
import EquipmentDetailPage from '@/pages/EquipmentDetailPage'
import IncidentsPage from '@/pages/IncidentsPage'
import AnalysisPage from '@/pages/AnalysisPage'
import RecommendationsPage from '@/pages/RecommendationsPage'
import FollowUpPage from '@/pages/FollowUpPage'
import IngestionPage from '@/pages/IngestionPage'

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] text-slate-800 font-sans antialiased selection:bg-primary selection:text-white">
      {/* Plant Operations Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content Area */}
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {/* Top Bar with Global Search & Language Switcher */}
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Main Application Body */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
          <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/equipment" element={<EquipmentListPage />} />
              <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/follow-up" element={<FollowUpPage />} />
              <Route path="/ingestion" element={<IngestionPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/*" element={<MainLayout />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  )
}

