import { Route } from "react-router-dom";
import FactoryDashboard from "./FactorySection/FactoryDashboard";
import FactoryDashboardLayout from "./FactorySection/FactoryDashbordLayout";
import FactoryView from "./FactorySection/Factory Balance/FactoryView";
import EditRecords from "./FactorySection/Factory Balance/EditRecords";
import DailyProduction from "./FactorySection/Factory Balance/DailyProduction";
import DispatchAndReturn from "./FactorySection/Factory Balance/DispatchAndReturn";
import LabourOutput from "./FactorySection/Factory Balance/LabourOutput";
import LabourOutputList from "./FactorySection/Factory Balance/LabourOutputList";
import LabourOutputEdit from "./FactorySection/Factory Balance/LabourOutputEdit";

export default function FactoryRouter() {
  return (
    <Route path="/factory" element={<FactoryDashboardLayout />}>
      <Route index element={<FactoryDashboard />} />
      <Route path="dailyproduction" element={<DailyProduction />} />
      <Route path="dispatchandreturn" element={<DispatchAndReturn />} />
      <Route path="edit" element={<EditRecords />} />
      <Route path="labouroutput" element={<LabourOutput />} />
      <Route path="labouroutputlist" element={<LabourOutputList />} />
      <Route path="labouroutput/edit" element={<LabourOutputEdit />} />
      <Route path="view" element={<FactoryView />} />
    </Route>
  );
}