import { Route } from "react-router-dom";
import DashboardLayoutP from '../pages/PackingSection/PackingDashbordLayout';
import PackingDashboard from '../pages/PackingSection/PackingDashboard';

export const PackingRoutes = () => (
  <Route path="/packing" element={<DashboardLayoutP />}>
    <Route index element={<PackingDashboard />} />
  </Route>
);