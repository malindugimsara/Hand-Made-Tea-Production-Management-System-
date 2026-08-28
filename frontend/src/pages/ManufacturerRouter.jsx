import { Route } from "react-router-dom";
import ManufacturerDashboardLayout from "./Manufacturer/ManufacturerDashbordLayout";
import ManufacturerDashboard from "./Manufacturer/ManufacturerDashboard";
import WitherLeafForm from "./Manufacturer/BL Operation/WitherLeafForm";
import FactoryLoftLeaf from "./Manufacturer/LoftLeaf/FactoryLoftLeaf";
import { View } from "lucide-react";
import ViewLoftLeafCount from "./Manufacturer/LoftLeaf/ViewFactoryLoftLeaf";
import SimpleAverage from "./Manufacturer/LoftLeaf/SimpleAverage";
import WeightAverage from "./Manufacturer/LoftLeaf/WeightAverage";
import WeeklyLoftLeafSummary from "./Manufacturer/SummaryReport/WeeklyLoftLeafSummary";
import CollectorQualityDiffReport from "./Manufacturer/SummaryReport/CollectorQualityDiffReport";


export default function ManufacturerRouter() {
  return (
    <Route path="/manufacturer" element={<ManufacturerDashboardLayout />}>
      <Route index element={<ManufacturerDashboard />} />
      <Route path="bl-production/witherLeafForm" element={<WitherLeafForm />} />
      <Route path="factory-loft-leaf" element={<FactoryLoftLeaf />} />
      <Route path="view-factory-loft-leaf" element={<ViewLoftLeafCount />} />
      <Route path="simple-avg-factory-loft-leaf" element={<SimpleAverage />} />
      <Route path="weight-avg-factory-loft-leaf" element={<WeightAverage />} />
      <Route path="weekly-loft-leaf-summary" element={<WeeklyLoftLeafSummary />} />
      <Route path="collector-quality-difference" element={<CollectorQualityDiffReport />} />
    </Route>
  );
}