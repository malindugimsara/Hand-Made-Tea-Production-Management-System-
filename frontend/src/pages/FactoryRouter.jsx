import React, { lazy } from "react";
import { Route } from "react-router-dom";

const FactoryDashboard = lazy(() => import("./FactorySection/FactoryDashboard"));
const FactoryDashboardLayout = lazy(() => import("./FactorySection/FactoryDashbordLayout"));
const FactoryView = lazy(() => import("./FactorySection/Factory Balance/Views/Factory Log/FactoryView"));
const EditRecords = lazy(() => import("./FactorySection/Factory Balance/Views/Factory Log/EditRecords"));
const DailyProduction = lazy(() => import("./FactorySection/Factory Balance/Inputes/DailyProduction"));
const DispatchAndReturn = lazy(() => import("./FactorySection/Factory Balance/Inputes/DispatchAndReturn"));
const LabourOutput = lazy(() => import("./FactorySection/Factory Balance/Inputes/LabourOutput"));
const LabourOutputList = lazy(() => import("./FactorySection/Factory Balance/Views/Labour Output/LabourOutputList"));
const LabourOutputEdit = lazy(() => import("./FactorySection/Factory Balance/Views/Labour Output/LabourOutputEdit"));
const FactoryPacking = lazy(() => import("./FactorySection/Factory Balance/Inputes/FactoryPacking"));
const DispatchRecordsView = lazy(() => import("./FactorySection/Factory Balance/Views/DIspatch View/DispatchRecordsView"));
const EditDispatchLog = lazy(() => import("./FactorySection/Factory Balance/Views/DIspatch View/EditDispatchLog"));
const PackingStockSummary = lazy(() => import("./FactorySection/Factory Balance/Views/Packing/PackingStockSummary"));
const PackingStockEdit = lazy(() => import("./FactorySection/Factory Balance/Views/Packing/PackingStockEdit"));
const DispatchDashboard = lazy(() => import("./FactorySection/Factory Balance/Views/DIspatch View/DispatchDashboard"));

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
      <Route path="packingsummary" element={<PackingStockSummary />} />
      <Route path="packing/edit/:date" element={<PackingStockEdit />} />
      <Route path="dispatchdashboard" element={<DispatchDashboard />} />
    </Route>
  );
}
