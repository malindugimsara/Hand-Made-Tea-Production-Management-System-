import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Import your Layout and Pages
import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/sideBar/HandMadeDashbord';
import GreenLeafForm from './pages/sideBar/GreenLeaf/GreenLeafForm';
import ViewGreenLeafForm from './pages/sideBar/GreenLeaf/ViewGreenLeafForm';
import EditRecordPage from './pages/sideBar/GreenLeaf/EditRecordPage';
import DehydratorRecordForm from './pages/sideBar/Dehydrator/DehydratorRecordForm';
import ViewDehydratorRecords from './pages/sideBar/Dehydrator/ViewDehydratorRecords';
import EditDehydratorRecord from './pages/sideBar/Dehydrator/EditDehydratorRecord';
import ProductionSummary from './pages/sideBar/Summary/ProductionSummary';
import SellingDetailsTable from './pages/sideBar/Summary/SellingDetailsTable';
import CostOfProduction from './pages/sideBar/Summary/CostOfProduction';
import Login from './pages/Login'; 
import RawMaterialCost from './pages/sideBar/RawMaterial/RawMaterialCost';
import ViewRawMaterialCost from './pages/sideBar/RawMaterial/ViewRawMaterialCost';
import EditRawMaterialCost from './pages/sideBar/RawMaterial/EditRawMaterialCost';
import ManageUsers from './pages/Users/ManageUsers';
import CreateUserForm from './pages/Users/CreateUserForm';
import { Analytics } from "@vercel/analytics/react"

// --- NEW PACKING LAYOUT ---
import DashboardLayoutP from './pages/PackingSection/PackingDashbordLayout';
import PackingDashboard from './pages/PackingSection/PackingDashboard';

// --- SECURITY GUARD: Protected Route ---
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" /> 
      <Analytics />
      <Routes>
        {/* We map Login to /login to prevent conflicts with your dashboard root */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Login />} />

        {/* ALL PROTECTED ROUTES GO IN HERE */}
        <Route element={<ProtectedRoute />}>
          
          {/* ========================================== */}
          {/* LAYOUT 1: HANDMADE TEA SECTION (Root)        */}
          {/* ========================================== */}
          <Route path="/" element={<DashboardLayout />}>
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="manage-users" element={<ManageUsers />} />
            <Route path="create-user" element={<CreateUserForm />} />
            <Route path="green-leaf-form" element={<GreenLeafForm />} />
            <Route path="view-green-leaf" element={<ViewGreenLeafForm />} />
            <Route path="edit-record" element={<EditRecordPage />} />
            <Route path="dehydrator-record-form" element={<DehydratorRecordForm />} />
            <Route path="view-dehydrator-records" element={<ViewDehydratorRecords />} />
            <Route path="selling-details-table" element={<SellingDetailsTable />} />
            <Route path="edit-dehydrator" element={<EditDehydratorRecord />} />
            <Route path="production-summary" element={<ProductionSummary />} />
            <Route path="cost-of-production" element={<CostOfProduction />} />
            <Route path="raw-material-cost" element={<RawMaterialCost />} />
            <Route path="view-raw-material-cost" element={<ViewRawMaterialCost />} />
            <Route path="edit-raw-material-cost" element={<EditRawMaterialCost />} />
          </Route>
          {/* <--- END OF LAYOUT 1 */}

          {/* ========================================== */}
          {/* LAYOUT 2: PACKING SECTION                    */}
          {/* ========================================== */}
          <Route path="/packing" element={<DashboardLayoutP />}>
             {/* When you create pages for Packing, put them here just like above! */}
             <Route index element={<PackingDashboard />} />
          </Route>
          {/* <--- END OF LAYOUT 2 */}

        </Route>
      </Routes>
    </BrowserRouter>
  );
}