import { Route } from "react-router-dom";
import ManufacturerDashboardLayout from "./Manufacturer/ManufacturerDashbordLayout";
import ManufacturerDashboard from "./Manufacturer/ManufacturerDashboard";
import WitherLeafForm from "./Manufacturer/BL Operation/WitherLeafForm";
import FactoryLoftLeaf from "./Manufacturer/LoftLeaf/FActoryLoftLeaf";
import { View } from "lucide-react";
import ViewLoftLeafCount from "./Manufacturer/LoftLeaf/ViewFactoryLoftLeaf";


export default function   ManufacturerRouter() {
  return (
    <Route path="/manufacturer" element={<ManufacturerDashboardLayout />}>
      <Route index element={<ManufacturerDashboard />} />
      <Route path="bl-production/witherLeafForm" element={<WitherLeafForm />} />
      <Route path="factory-loft-leaf" element={<FactoryLoftLeaf />} />
      <Route path="view-factory-loft-leaf" element={<ViewLoftLeafCount />} />

    </Route>
  );
}