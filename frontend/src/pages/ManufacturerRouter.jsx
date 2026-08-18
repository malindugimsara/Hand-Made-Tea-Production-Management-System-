import { Route } from "react-router-dom";
import ManufacturerDashboardLayout from "./Manufacturer/ManufacturerDashbordLayout";
import ManufacturerDashboard from "./Manufacturer/ManufacturerDashboard";


export default function   ManufacturerRouter() {
  return (
    <Route path="/manufacturer" element={<ManufacturerDashboardLayout />}>
      <Route index element={<ManufacturerDashboard />} />
    </Route>
  );
}