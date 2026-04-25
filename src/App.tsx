import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import OverviewPage from './pages/OverviewPage';
import PatientPage from './pages/PatientPage';
import DrilldownPage from './pages/DrilldownPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/patient/:id" element={<PatientPage />} />
          <Route path="/patient/:id/model/:modelKey" element={<DrilldownPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}