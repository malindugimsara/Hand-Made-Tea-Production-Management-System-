import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
// Import your Layout and Pages

import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/sideBar/home';
import CostingForm from './pages/sideBar/CostingForm';
import SalesForm from './pages/sideBar/SalesForm';
import GreenLeafForm from './pages/sideBar/GreenLeaf/GreenLeafForm';
import ViewGreenLeafForm from './pages/sideBar/GreenLeaf/ViewGreenLeafForm';
import EditRecordPage from './pages/sideBar/GreenLeaf/EditRecordPage';
import DehydratorRecordForm from './pages/sideBar/Dehydrator/DehydratorRecordForm';
import ViewDehydratorRecords from './pages/sideBar/Dehydrator/ViewDehydratorRecords';
import EditDehydratorRecord from './pages/sideBar/Dehydrator/EditDehydratorRecord';
import ProductionSummary from './pages/sideBar/Summary/ProductionSummary';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" /> 
      <Routes>
        {/* The DashboardLayout wraps everything */}
        <Route path="/" element={<DashboardLayout />}>
          {/* These pages render inside the <Outlet /> based on the URL */}
          <Route index element={<DashboardHome />} />
          <Route path="green-leaf-form" element={<GreenLeafForm />} />
          <Route path="costing" element={<CostingForm />} />
          <Route path="sales" element={<SalesForm />} />
          <Route path="view-green-leaf" element={<ViewGreenLeafForm />} />
          <Route path="/edit-record" element={<EditRecordPage />} />
          <Route path="/dehydrator-record-form" element={<DehydratorRecordForm />} />
          <Route path="/view-dehydrator-records" element={<ViewDehydratorRecords />} />
          <Route path="/edit-dehydrator" element={<EditDehydratorRecord />} />
          <Route path="/production-summary" element={<ProductionSummary />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}