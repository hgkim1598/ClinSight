import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AiModeProvider } from './context/AiModeContext';
import { MetaProvider } from './context/MetaContext';
import { SnackbarProvider } from './context/SnackbarContext';
import { PatientsProvider } from './context/PatientsContext';
import RequireAuth from './components/auth/RequireAuth';
import Layout from './components/layout/Layout';
import OverviewPage from './pages/OverviewPage';
import PatientPage from './pages/PatientPage';
import DrilldownPage from './pages/DrilldownPage';
import LoginPage from './pages/LoginPage';
import AlertsPage from './pages/AlertsPage';
import ConsultationsPage from './pages/ConsultationsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MetaProvider>
          <SnackbarProvider>
            <AiModeProvider>
              <PatientsProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<RequireAuth />}>
                  <Route element={<Layout />}>
                    <Route path="/" element={<OverviewPage />} />
                    <Route path="/patient/:stayId" element={<PatientPage />} />
                    <Route
                      path="/patient/:stayId/model/:modelKey"
                      element={<DrilldownPage />}
                    />
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/consultations" element={<ConsultationsPage />} />
                  </Route>
                </Route>
              </Routes>
              </PatientsProvider>
            </AiModeProvider>
          </SnackbarProvider>
        </MetaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
