import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import your Layout and Pages

import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/sideBar/home';
import ProductionForm from './pages/sideBar/productionForm'
import CostingForm from './pages/sideBar/CostingForm';
import SalesForm from './pages/sideBar/SalesForm';
import GreenLeafForm from './pages/sideBar/GreenLeafForm';
import { Toaster } from 'react-hot-toast';

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
          <Route path="production" element={<ProductionForm />} />
          <Route path="costing" element={<CostingForm />} />
          <Route path="sales" element={<SalesForm />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}