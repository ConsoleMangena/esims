import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Blank from "./pages/Blank";

import RequireRole from "./components/auth/RequireRole";
import RoleRedirect from "./components/auth/RoleRedirect";

// Surveyor
import SurveyorDashboard from "./pages/Surveyor/Dashboard";
import SubmitSurvey from "./pages/Surveyor/SubmitSurvey";
import MySubmissions from "./pages/Surveyor/MySubmissions";
import SurveyorTransactionDetails from "./pages/Surveyor/TransactionDetails";

// Manager
import ManagerDashboard from "./pages/Manager/Dashboard";
import VerifySubmissions from "./pages/Manager/VerifySubmissions";
import ProjectTransactions from "./pages/Manager/ProjectTransactions";
import UserManagement from "./pages/Manager/UserManagement";
import ReportsAnalytics from "./pages/Manager/ReportsAnalytics";

// Client
import ClientDashboard from "./pages/Client/Dashboard";
import SurveyResults from "./pages/Client/SurveyResults";
import AuditTrail from "./pages/Client/AuditTrail";
import ProjectTimeline from "./pages/Client/ProjectTimeline";

// Admin
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminUsers from "./pages/Admin/UserAccounts";
import SmartContracts from "./pages/Admin/SmartContracts";
import NodeMonitoring from "./pages/Admin/NodeMonitoring";
import SystemLogs from "./pages/Admin/SystemLogs";
import Settings from "./pages/Admin/Settings";

// Common
import ProfileSettings from "./pages/Common/ProfileSettings";
import NotificationsPage from "./pages/Common/Notifications";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* App Layout */}
          <Route element={<AppLayout />}>
            {/* Root redirect based on role */}
            <Route index path="/" element={<RoleRedirect />} />

            {/* Surveyor */}
            <Route
              path="/surveyor"
              element={
                <RequireRole roles={["surveyor"]}>
                  <SurveyorDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/surveyor/submit"
              element={
                <RequireRole roles={["surveyor"]}>
                  <SubmitSurvey />
                </RequireRole>
              }
            />
            <Route
              path="/surveyor/submissions"
              element={
                <RequireRole roles={["surveyor"]}>
                  <MySubmissions />
                </RequireRole>
              }
            />
            <Route
              path="/surveyor/transactions/:id"
              element={
                <RequireRole roles={["surveyor"]}>
                  <SurveyorTransactionDetails />
                </RequireRole>
              }
            />
            <Route
              path="/surveyor/profile"
              element={
                <RequireRole roles={["surveyor"]}>
                  <ProfileSettings />
                </RequireRole>
              }
            />

            {/* Manager */}
            <Route
              path="/manager"
              element={
                <RequireRole roles={["manager"]}>
                  <ManagerDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/manager/verification"
              element={
                <RequireRole roles={["manager"]}>
                  <VerifySubmissions />
                </RequireRole>
              }
            />
            <Route
              path="/manager/transactions"
              element={
                <RequireRole roles={["manager"]}>
                  <ProjectTransactions />
                </RequireRole>
              }
            />
            <Route
              path="/manager/users"
              element={
                <RequireRole roles={["manager"]}>
                  <UserManagement />
                </RequireRole>
              }
            />
            <Route
              path="/manager/reports"
              element={
                <RequireRole roles={["manager"]}>
                  <ReportsAnalytics />
                </RequireRole>
              }
            />
            <Route
              path="/manager/profile"
              element={
                <RequireRole roles={["manager"]}>
                  <ProfileSettings />
                </RequireRole>
              }
            />

            {/* Client */}
            <Route
              path="/client"
              element={
                <RequireRole roles={["client"]}>
                  <ClientDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/client/results"
              element={
                <RequireRole roles={["client"]}>
                  <SurveyResults />
                </RequireRole>
              }
            />
            <Route
              path="/client/audit"
              element={
                <RequireRole roles={["client"]}>
                  <AuditTrail />
                </RequireRole>
              }
            />
            <Route
              path="/client/timeline"
              element={
                <RequireRole roles={["client"]}>
                  <ProjectTimeline />
                </RequireRole>
              }
            />
            <Route
              path="/client/profile"
              element={
                <RequireRole roles={["client"]}>
                  <ProfileSettings />
                </RequireRole>
              }
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <RequireRole roles={["admin"]}>
                  <AdminDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireRole roles={["admin"]}>
                  <AdminUsers />
                </RequireRole>
              }
            />
            <Route
              path="/admin/contracts"
              element={
                <RequireRole roles={["admin"]}>
                  <SmartContracts />
                </RequireRole>
              }
            />
            <Route
              path="/admin/nodes"
              element={
                <RequireRole roles={["admin"]}>
                  <NodeMonitoring />
                </RequireRole>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <RequireRole roles={["admin"]}>
                  <SystemLogs />
                </RequireRole>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <RequireRole roles={["admin"]}>
                  <Settings />
                </RequireRole>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <RequireRole roles={["admin"]}>
                  <ProfileSettings />
                </RequireRole>
              }
            />

            {/* Utility Pages */}
            <Route
              path="/notifications"
              element={
                <RequireRole roles={["surveyor", "manager", "client", "admin"]}>
                  <NotificationsPage />
                </RequireRole>
              }
            />
            <Route path="/blank" element={<Blank />} />
            <Route path="/error-404" element={<NotFound />} />
          </Route>

          {/* Auth */}
          <Route path="/login" element={<SignIn />} />
          <Route path="/register" element={<SignUp />} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
