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
import GuideIssueRecordEntry from "./PackingSection/Guide/GuideIssueRecordEntry";
import ViewGuideIssueRecords from "./PackingSection/Guide/ViewGuideIssueRecords";
import EditTeaCenterRecord from "./PackingSection/Tea center/EditTeaCenterRecord";
import EditGuideIssueRecord from "./PackingSection/Guide/EditGuideIssueRecord";

export const PackingRoutes = () => (
  <Route path="/packing" element={<DashboardLayoutP />}>
    <Route index element={<PackingDashboard />} />
    <Route path="local-record-entry" element={<LocalRecordEntry />} />
    <Route path="local-record-view" element={<ViewLocalSaleRecords />} />
    <Route path="edit-local-sale" element={<EditLocalRecord />} />
    <Route path="tea-center-record-entry" element={<TeaCenterRecordEntry />} />
    <Route path="tea-center-record-view" element={<ViewTeaCenterRecords />} />
    <Route path="edit-tea-center-issue" element={<EditTeaCenterRecord />} />
    <Route path="guide-issues-record-entry" element={<GuideIssueRecordEntry />} />
    <Route path="guide-issues-record-view" element={<ViewGuideIssueRecords />} />
    <Route path="edit-guide-issue" element={<EditGuideIssueRecord />} />
    <Route path="trans-in-entry" element={<TransIn />} />
    <Route path="trans-in-view" element={<ViewTransInRecords />} />

  </Route>
);