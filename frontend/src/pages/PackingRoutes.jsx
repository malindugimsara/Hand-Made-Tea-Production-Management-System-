import { Route } from "react-router-dom";
import DashboardLayoutP from '../pages/PackingSection/PackingDashbordLayout';
import PackingDashboard from '../pages/PackingSection/PackingDashboard';
import LocalRecordEntry from "./PackingSection/Local Sales/LocalRecordEntry";
import ViewLocalSaleRecords from "./PackingSection/Local Sales/ViewLocalSaleRecords";
import EditLocalRecord from "./PackingSection/Local Sales/EditLocalRecord";
import TransIn from "./PackingSection/Trans in/TransIn";
import ViewTransInRecords from "./PackingSection/Trans in/ViewTransInRecords";

export const PackingRoutes = () => (
  <Route path="/packing" element={<DashboardLayoutP />}>
    <Route index element={<PackingDashboard />} />
    <Route path="local-record-entry" element={<LocalRecordEntry />} />
    <Route path="local-record-view" element={<ViewLocalSaleRecords />} />
    <Route path="edit-local-sale" element={<EditLocalRecord />} />
    <Route path="trans-in-entry" element={<TransIn />} />
    <Route path="trans-in-view" element={<ViewTransInRecords />} />

  </Route>
);