import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Employees from "./pages/Employees.tsx";
import Attendance from "./pages/Attendance.tsx";
import Payroll from "./pages/Payroll.tsx";
import Leave from "./pages/Leave.tsx";
import Profile from "./pages/Profile.tsx";
import EmployeeProfile from "./pages/EmployeeProfile.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:userId" element={<EmployeeProfile />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/leave" element={<Leave />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
