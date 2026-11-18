import { lazy, Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { FeedbackProvider } from '@/components/ui/Feedback'
import { SettingsProvider } from '@/hooks/useSettings'
import { AppShell } from '@/components/layout/AppShell'
import { Splash } from '@/components/layout/Splash'
import { TaskCompletionProvider } from '@/features/calendar/TaskCompletion'
import { PwaManager } from '@/components/layout/PwaManager'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const BatchesPage = lazy(() => import('@/features/batches/BatchesPage'))
const BatchDetailPage = lazy(() => import('@/features/batches/BatchDetailPage'))
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage'))
const JournalPage = lazy(() => import('@/features/journal/JournalPage'))
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage'))
const SalesPage = lazy(() => import('@/features/sales/SalesPage'))
const InstructionsPage = lazy(() => import('@/features/instructions/InstructionsPage'))
const InstructionDetailPage = lazy(() => import('@/features/instructions/InstructionDetailPage'))
const BusinessPlanPage = lazy(() => import('@/features/plan/BusinessPlanPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <FeedbackProvider>
        <PwaManager />
        <SettingsProvider fallback={<Splash />}>
          <TaskCompletionProvider>
          <AppShell>
            <Suspense fallback={<div className="py-24" />}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/partie" element={<BatchesPage />} />
                <Route path="/partie/:id" element={<BatchDetailPage />} />
                <Route path="/kalendarz" element={<CalendarPage />} />
                <Route path="/dziennik" element={<JournalPage />} />
                <Route path="/wydatki" element={<ExpensesPage />} />
                <Route path="/sprzedaz" element={<SalesPage />} />
                <Route path="/instrukcje" element={<InstructionsPage />} />
                <Route path="/instrukcje/:id" element={<InstructionDetailPage />} />
                <Route path="/biznesplan" element={<BusinessPlanPage />} />
                <Route path="/ustawienia" element={<SettingsPage />} />
                <Route path="*" element={<DashboardPage />} />
              </Routes>
            </Suspense>
          </AppShell>
          </TaskCompletionProvider>
        </SettingsProvider>
      </FeedbackProvider>
    </HashRouter>
  )
}
