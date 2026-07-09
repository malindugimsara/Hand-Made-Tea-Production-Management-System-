import { Route } from "react-router-dom";
import FactoryDashboard from "./FactorySection/FactoryDashboard";
import FactoryDashboardLayout from "./FactorySection/FactoryDashbordLayout";
import FactoryView from "./FactorySection/Factory Balance/Views/Factory Log/FactoryView";
import EditRecords from "./FactorySection/Factory Balance/Views/Factory Log/EditRecords";
import DailyProduction from "./FactorySection/Factory Balance/Inputes/DailyProduction";
import DispatchAndReturn from "./FactorySection/Factory Balance/Inputes/DispatchAndReturn";
import LabourOutput from "./FactorySection/Factory Balance/Inputes/LabourOutput";
import LabourOutputList from "./FactorySection/Factory Balance/Views/Labour Output/LabourOutputList";
import LabourOutputEdit from "./FactorySection/Factory Balance/Views/Labour Output/LabourOutputEdit";
import FactoryPacking from "./FactorySection/Factory Balance/Inputes/FactoryPacking";
import DispatchRecordsView from "./FactorySection/Factory Balance/Views/DIspatch View/DispatchRecordsView";
import EditDispatchLog from "./FactorySection/Factory Balance/Views/DIspatch View/EditDispatchLog";

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
      <Route path="factorypacking" element={<FactoryPacking />} />
      <Route path="dispatchrecords" element={<DispatchRecordsView />} />
      <Route path="dispatch/edit" element={<EditDispatchLog />} />
    </Route>
  );
}