import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { AuthGuard } from '@/components/routing/AuthGuard'
import { AccountsPage } from '@/pages/AccountsPage'
import { BudgetsPage } from '@/pages/BudgetsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DataPrivacySettingsPage } from '@/pages/settings/DataPrivacySettingsPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { HelpSettingsPage } from '@/pages/settings/HelpSettingsPage'
import { ImportDataSettingsPage } from '@/pages/settings/ImportDataSettingsPage.tsx'
import { LinkedAccountsSettingsPage } from '@/pages/settings/LinkedAccountsSettingsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotificationsSettingsPage } from '@/pages/settings/NotificationsSettingsPage'
import { PreferencesSettingsPage } from '@/pages/settings/PreferencesSettingsPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SecuritySettingsPage } from '@/pages/settings/SecuritySettingsPage'
import { SettingsOverviewPage } from '@/pages/settings/SettingsOverviewPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { CategoriesSettingsPage } from '@/pages/settings/CategoriesSettingsPage'
import { ProfileSettingsPage } from '@/pages/settings/ProfileSettingsPage'
import { useAuthStore } from '@/stores/useAuthStore'

const App = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />
      <Route
        path="/forgot-password"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />}
      />

      <Route element={<AuthGuard />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<SettingsOverviewPage />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="security" element={<SecuritySettingsPage />} />
            <Route path="preferences" element={<PreferencesSettingsPage />} />
            <Route path="notifications" element={<NotificationsSettingsPage />} />
            <Route path="categories" element={<CategoriesSettingsPage />} />
            <Route path="linked-accounts" element={<LinkedAccountsSettingsPage />} />
            <Route path="data-privacy" element={<DataPrivacySettingsPage />} />
            <Route path="import-data" element={<ImportDataSettingsPage />} />
            <Route path="help" element={<HelpSettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

export default App
