import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Profile from './pages/Profile'

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
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#06060d' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
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
          <Route path="/profile" element={
            <PrivateRoute>
              <AppLayout>
                <Profile />
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