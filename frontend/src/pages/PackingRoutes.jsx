import React, { lazy } from "react";
import { Route } from "react-router-dom";

const DashboardLayoutP = lazy(() => import('./PackingSection/PackingDashbordLayout'));
const PackingDashboard = lazy(() => import('./PackingSection/PackingDashboard'));
const LocalRecordEntry = lazy(() => import("./PackingSection/Local Sales/LocalRecordEntry"));
const ViewLocalSaleRecords = lazy(() => import("./PackingSection/Local Sales/ViewLocalSaleRecords"));
const EditLocalRecord = lazy(() => import("./PackingSection/Local Sales/EditLocalRecord"));
const TeaCenterRecordEntry = lazy(() => import("./PackingSection/Tea center/TeaCenterRecordEntry"));
const ViewTeaCenterRecords = lazy(() => import("./PackingSection/Tea center/ViewTeaCenterRecord"));
const TransIn = lazy(() => import("./PackingSection/Trans in/TransIn"));
const ViewTransInRecords = lazy(() => import("./PackingSection/Trans in/ViewTransInRecords"));
const EditTeaCenterRecord = lazy(() => import("./PackingSection/Tea center/EditTeaCenterRecord"));
const TeaGradesReceivedEntry = lazy(() => import("./PackingSection/Trans In Factory/TeaGradesReceivedEntry"));
const EditTeaReceivedRecord = lazy(() => import("./PackingSection/Trans In Factory/EditTeaReceivedRecord"));
const ViewTeaGradesReceivedRecords = lazy(() => import("./PackingSection/Trans In Factory/ViewTeaGradesReceivedRecords"));
const ProductIssueSummary = lazy(() => import("./PackingSection/Summary report/ProductIssueSummary"));
const ViewPackingStock = lazy(() => import("./PackingSection/Summary Report/ViewPackingStock"));
const TeaGradesReceivedOutEntry = lazy(() => import("./PackingSection/Trans In other/TeaGradesReceivedOutEntry"));
const ViewTeaGradesReceivedOutRecords = lazy(() => import("./PackingSection/Trans In other/ViewTeaGradesReceivedOutRecords"));
const RawMaterialInEntry = lazy(() => import("./PackingSection/Trans In RawMaterial/RawMaterialInEntry"));
const ViewRawMaterialInRecords = lazy(() => import("./PackingSection/Trans In RawMaterial/ViewRawMaterialInRecords"));
const EditTeaReceivedOutRecord = lazy(() => import("./PackingSection/Trans In other/EditTeaReceivedOutRecord"));
const EditRawMaterialIn = lazy(() => import("./PackingSection/Trans In RawMaterial/EditRawMaterialIn"));
const StockAdjustment = lazy(() => import("./PackingSection/Stock Adjustment/StockAdjustment"));
const StockAdjustmentHistory = lazy(() => import("./PackingSection/Stock Adjustment/StockAdjustmentHistory"));
const EditStockAdjustment = lazy(() => import("./PackingSection/Stock Adjustment/EditStockAdjustment"));
const HistoricalStockView = lazy(() => import("./PackingSection/Summary Report/HistoricalStockView"));

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
    <Route path="historical-stock" element={<HistoricalStockView />} />

    {/* Trans in other */}
    <Route path="trans-in-other" element={<TeaGradesReceivedOutEntry />} />
    <Route path="trans-in-view-other" element={<ViewTeaGradesReceivedOutRecords />} />
    <Route path="edit-received-out-record" element={<EditTeaReceivedOutRecord />} />

    {/* Raw Material */}
    <Route path="trans-in-raw-material" element={<RawMaterialInEntry />} />
    <Route path="trans-in-view-raw-material" element={<ViewRawMaterialInRecords />} />
    <Route path="edit-raw-material-in" element={<EditRawMaterialIn />} />

    <Route path="stock-adjustment-entry" element={<StockAdjustment />} />
    <Route path="stock-adjustment-view" element={<StockAdjustmentHistory />} />
    <Route path="stock-adjustment-edit" element={<EditStockAdjustment />} />
  </Route>
);
