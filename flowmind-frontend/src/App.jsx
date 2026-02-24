import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Goals from './pages/Goals'
import Planner from './pages/Planner'
import AIChat from './pages/AIChat'
import Analytics from './pages/Analytics'
import Pomodoro from './pages/Pomodoro'

// Components
import Sidebar from './components/Sidebar'
import LoadingScreen from './components/LoadingScreen'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  return user ? children : <Navigate to="/login" />
}

function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <PrivateRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/goals" element={
            <PrivateRoute>
              <AppLayout>
                <Goals />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/planner" element={
            <PrivateRoute>
              <AppLayout>
                <Planner />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/chat" element={
            <PrivateRoute>
              <AppLayout>
                <AIChat />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/analytics" element={
            <PrivateRoute>
              <AppLayout>
                <Analytics />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="/pomodoro" element={
            <PrivateRoute>
              <AppLayout>
                <Pomodoro />
              </AppLayout>
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App