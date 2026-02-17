import { useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { PatientProvider } from './context/PatientContext';
import Layout from './components/Layout';
// import Home from './pages/Home'; // Deprecated in new flow
import PatientIntake from './pages/PatientIntake';
import ExerciseSetup from './pages/ExerciseSetup';
import ExercisePage from './pages/ExercisePage';
import DashboardPage from './pages/DashboardPage';
import ExerciseDashboardPage from './pages/ExerciseDashboardPage';
import TherapistDashboard from './pages/TherapistDashboard';
import './index.css';

function App() {
  return (
    <Router>
      <PatientProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<PatientIntake />} />
            <Route path="/setup" element={<ExerciseSetup />} />
            <Route
              path="/session/:exerciseId"
              element={<ExercisePage />}
            />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/:exerciseId" element={<ExerciseDashboardPage />} />
            <Route path="/therapist" element={<TherapistDashboard />} />
          </Routes>
        </Layout>
      </PatientProvider>
    </Router>
  );
}

export default App;
