import { Route } from "react-router-dom";
import DashboardLayoutP from '../pages/PackingSection/PackingDashbordLayout';
import PackingDashboard from '../pages/PackingSection/PackingDashboard';
import LocalRecordEntry from "./PackingSection/Local Sales/LocalRecordEntry";
import ViewLocalSaleRecords from "./PackingSection/Local Sales/ViewLocalSaleRecords";
import EditLocalRecord from "./PackingSection/Local Sales/EditLocalRecord";
import TeaCenterRecordEntry from "./PackingSection/Tea center/TeaCenterRecordEntry";
import ViewTeaCenterRecords from "./PackingSection/Tea center/ViewTeaCenterRecord";
import TransIn from "./PackingSection/Trans in/TransIn";
import ViewTransInRecords from "./PackingSection/Trans in/ViewTransInRecords";
import EditTeaCenterRecord from "./PackingSection/Tea center/EditTeaCenterRecord";
import TeaGradesReceivedEntry from "./PackingSection/Trans In Factory/TeaGradesReceivedEntry";
import EditTeaReceivedRecord from "./PackingSection/Trans In Factory/EditTeaReceivedRecord";
import ViewTeaGradesReceivedRecords from "./PackingSection/Trans In Factory/ViewTeaGradesReceivedRecords";
import ProductIssueSummary from "./PackingSection/Summary report/ProductIssueSummary";
import ViewPackingStock from "./PackingSection/Summary Report/ViewPackingStock";

export const PackingRoutes = () => (
  <Route path="/packing" element={<DashboardLayoutP />}>
    <Route index element={<PackingDashboard />} />
    <Route path="local-record-entry" element={<LocalRecordEntry />} />
    <Route path="local-record-view" element={<ViewLocalSaleRecords />} />
    <Route path="edit-local-sale" element={<EditLocalRecord />} />
    <Route path="tea-center-record-entry" element={<TeaCenterRecordEntry />} />
    <Route path="tea-center-record-view" element={<ViewTeaCenterRecords />} />
    <Route path="edit-tea-center-issue" element={<EditTeaCenterRecord />} />
    <Route path="trans-in-factory-entry" element={<TeaGradesReceivedEntry />} />
    <Route path="trans-in-factory-view" element={<ViewTeaGradesReceivedRecords />} />
    <Route path="edit-received-record" element={<EditTeaReceivedRecord />} />
    <Route path="trans-in-entry" element={<TransIn />} />
    <Route path="trans-in-view" element={<ViewTransInRecords />} />
    <Route path="product-issue-summary" element={<ProductIssueSummary />} />    
    <Route path="summary-reports" element={<ViewPackingStock />} />

  </Route>
);