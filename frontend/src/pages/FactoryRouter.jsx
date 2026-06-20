import { Route } from "react-router-dom";
import FactoryDashboard from "./FactorySection/FactoryDashboard";
import FactoryDashboardLayout from "./FactorySection/FactoryDashbordLayout";
import FactoryView from "./FactorySection/Factory Balance/FactoryView";
import FactoryRecordEntry from "./FactorySection/Factory Balance/FactoryRecordEntry";
import EditRecords from "./FactorySection/Factory Balance/EditRecords";

export default function FactoryRouter() {
  return (
    <Route path="/factory" element={<FactoryDashboardLayout />}>
      <Route index element={<FactoryDashboard />} />
      <Route path="entry" element={<FactoryRecordEntry />} />
      <Route path="edit" element={<EditRecords />} />
      <Route path="view" element={<FactoryView />} />

      {/* Add more factory-specific routes here */}
    </Route>
  );
}