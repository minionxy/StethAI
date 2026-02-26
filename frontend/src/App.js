import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import PatientDashboard from "./pages/patient/Dashboard";
import PatientHistory from "./pages/patient/History";

import DoctorDashboard from "./pages/doctor/Dashboard";
import DoctorReports from "./pages/doctor/Reports";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* patient */}
        <Route path="/patient/dashboard"
          element={<ProtectedRoute><PatientDashboard /></ProtectedRoute>}
        />
        <Route path="/patient/history"
          element={<ProtectedRoute><PatientHistory /></ProtectedRoute>}
        />

        {/* doctor */}
        <Route path="/doctor/dashboard"
          element={<ProtectedRoute><DoctorDashboard /></ProtectedRoute>}
        />
        <Route path="/doctor/reports"
          element={<ProtectedRoute><DoctorReports /></ProtectedRoute>}
        />
      </Routes>
    </BrowserRouter>
  );
}