import { Route } from "react-router-dom";
import ManufacturerDashboardLayout from "./Manufacturer/ManufacturerDashbordLayout";
import ManufacturerDashboard from "./Manufacturer/ManufacturerDashboard";
import WitherLeafForm from "./Manufacturer/BL Operation/WitherLeafForm";


export default function   ManufacturerRouter() {
  return (
    <Route path="/manufacturer" element={<ManufacturerDashboardLayout />}>
      <Route index element={<ManufacturerDashboard />} />
      <Route path="bl-production/witherLeafForm" element={<WitherLeafForm />} />
    </Route>
  );
}