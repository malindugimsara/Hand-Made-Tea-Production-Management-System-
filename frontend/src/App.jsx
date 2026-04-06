import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Import your Layout and Pages
import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/sideBar/home';
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

// --- SECURITY GUARD: Protected Route ---
// This checks if the user has a token in localStorage.
// If they don't, it kicks them back to the login page.
const ProtectedRoute = () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // If they have a token, let them proceed to the requested page
  return <Outlet />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" /> 
      
      <Routes>
        {/* =========================================
            1. INDEPENDENT ROUTES (No Sidebar)
            ========================================= */}
        <Route path="/login" element={<Login />} />


        {/* =========================================
            2. SECURE DASHBOARD ROUTES
            ========================================= */}
        {/* First, pass through the Security Guard */}
        <Route element={<ProtectedRoute />}>
          
          {/* Second, wrap the authorized user in the Dashboard Layout */}
          <Route path="/" element={<DashboardLayout />}>
            
            {/* Third, load the specific page inside the Layout's Outlet */}
            <Route index element={<DashboardHome />} />
            <Route path="green-leaf-form" element={<GreenLeafForm />} />
            <Route path="view-green-leaf" element={<ViewGreenLeafForm />} />
            <Route path="edit-record" element={<EditRecordPage />} />
            <Route path="dehydrator-record-form" element={<DehydratorRecordForm />} />
            <Route path="view-dehydrator-records" element={<ViewDehydratorRecords />} />
            <Route path="selling-details-table" element={<SellingDetailsTable />} />
            <Route path="edit-dehydrator" element={<EditDehydratorRecord />} />
            <Route path="production-summary" element={<ProductionSummary />} />
            <Route path="/cost-of-production" element={<CostOfProduction />} />
            
          </Route>
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}