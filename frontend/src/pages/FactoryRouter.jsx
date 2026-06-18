import { Route } from "react-router-dom";
import FactoryDashboard from "./FactorySection/FactoryDashboard";
import FactoryDashboardLayout from "./FactorySection/FactoryDashbordLayout";

export default function FactoryRouter() {
  return (
    <Route path="/factory" element={<FactoryDashboardLayout />}>
      <Route index element={<FactoryDashboard />} />
      {/* Add more factory-specific routes here */}
    </Route>
  );
}