import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ProfileSetup from './pages/individual/ProfileSetup';
import IndividualDashboard from './pages/individual/IndividualDashboard';
import RiskAssessment from './pages/individual/RiskAssessment';
import Results from './pages/individual/Results';
import RiskMatrix from './pages/individual/RiskMatrix';
import BrowsePlans from './pages/individual/BrowsePlans';
import AssessmentHistory from './pages/individual/AssessmentHistory';
import MyApplications from './pages/individual/MyApplications';
import MyClaims from './pages/individual/MyClaims';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPlanApproval from './pages/admin/AdminPlanApproval';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import AdminScoringConfig from './pages/admin/AdminScoringConfig';
import AdminAssessments from './pages/admin/AdminAssessments';
import AdminApplications from './pages/admin/AdminApplications';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminClaims from './pages/admin/AdminClaims';
import AdminKnowledgeBase from './pages/admin/AdminKnowledgeBase';
import ProviderDashboard from './pages/provider/ProviderDashboard';
import ProviderApplications from './pages/provider/ProviderApplications';
import ProviderClaims from './pages/provider/ProviderClaims';
import AddPlan from './pages/provider/AddPlan';
import MyPlans from './pages/provider/MyPlans';
import EditPlan from './pages/provider/EditPlan';
import ResetPassword from './pages/ResetPassword';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import ChatWidget from './components/ChatWidget';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Individual user routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['individual', '']}>
            <IndividualDashboard />
          </ProtectedRoute>
        } />
        <Route path="/profile-setup" element={
          <ProtectedRoute allowedRoles={['individual', '']}>
            <ProfileSetup />
          </ProtectedRoute>
        } />
        <Route path="/assessment" element={
          <ProtectedRoute allowedRoles={['individual', '']}>
            <RiskAssessment />
          </ProtectedRoute>
        } />
        <Route path="/results" element={
          <ProtectedRoute allowedRoles={['individual', '']}>
            <Results />
          </ProtectedRoute>
        } />
        <Route path="/scoring-matrix" element={
          <ProtectedRoute allowedRoles={['individual', '']}>
            <RiskMatrix />
          </ProtectedRoute>
        } />
        <Route path="/browse-plans" element={
          <ProtectedRoute allowedRoles={['individual', '']}>
            <BrowsePlans />
          </ProtectedRoute>
        } />
        <Route path="/assessment-history" element={
          <ProtectedRoute allowedRoles={['individual', '']}>
            <AssessmentHistory />
          </ProtectedRoute>
        } />
        <Route path="/my-applications" element={
          <ProtectedRoute allowedRoles={['individual', '']}>
            <MyApplications />
          </ProtectedRoute>
        } />
        <Route path="/my-claims" element={
          <ProtectedRoute allowedRoles={['individual', '']}>
            <MyClaims />
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/admin/dashboard" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/plan-approval" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPlanApproval />
          </ProtectedRoute>
        } />
        <Route path="/admin/user-management" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUserManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/scoring-config" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminScoringConfig />
          </ProtectedRoute>
        } />
        <Route path="/admin/assessments" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAssessments />
          </ProtectedRoute>
        } />
        <Route path="/admin/applications" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminApplications />
          </ProtectedRoute>
        } />
        <Route path="/admin/feedback" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminFeedback />
          </ProtectedRoute>
        } />
        <Route path="/admin/claims" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminClaims />
          </ProtectedRoute>
        } />
        <Route path="/admin/knowledge" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminKnowledgeBase />
          </ProtectedRoute>
        } />

        {/* Provider routes */}
        <Route path="/provider/dashboard" element={
          <ProtectedRoute allowedRoles={['provider']}>
            <ProviderDashboard />
          </ProtectedRoute>
        } />
        <Route path="/provider/add-plan" element={
          <ProtectedRoute allowedRoles={['provider']}>
            <AddPlan />
          </ProtectedRoute>
        } />
        <Route path="/provider/my-plans" element={
          <ProtectedRoute allowedRoles={['provider']}>
            <MyPlans />
          </ProtectedRoute>
        } />
        <Route path="/provider/edit-plan/:id" element={
          <ProtectedRoute allowedRoles={['provider']}>
            <EditPlan />
          </ProtectedRoute>
        } />
        <Route path="/provider/applications" element={
          <ProtectedRoute allowedRoles={['provider']}>
            <ProviderApplications />
          </ProtectedRoute>
        } />
        <Route path="/provider/claims" element={
          <ProtectedRoute allowedRoles={['provider']}>
            <ProviderClaims />
          </ProtectedRoute>
        } />

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ChatWidget />
    </BrowserRouter>
  );
}

export default App;
