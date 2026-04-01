import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import your Layout and Pages

import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/sideBar/home';
import CostingForm from './pages/sideBar/CostingForm';
import SalesForm from './pages/sideBar/SalesForm';
import GreenLeafForm from './pages/sideBar/GreenLeafForm';
import { Toaster } from 'react-hot-toast';
import ViewGreenLeafForm from './pages/sideBar/ViewGreenLeafForm';

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
        </Route>
      </Routes>
    </BrowserRouter>
  );
}