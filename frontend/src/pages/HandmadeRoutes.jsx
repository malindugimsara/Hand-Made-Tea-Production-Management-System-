import React, { lazy } from "react";
import { Route } from "react-router-dom";

const DashboardLayout = lazy(() => import("./sideBar/DashboardLayout"));
const DashboardHome = lazy(() => import('./sideBar/HandMadeDashbord'));
const ManageUsers = lazy(() => import('./Users/ManageUsers'));
const CreateUserForm = lazy(() => import('./Users/CreateUserForm'));
const GreenLeafForm = lazy(() => import('./sideBar/GreenLeaf/GreenLeafForm'));
const ViewGreenLeafForm = lazy(() => import('./sideBar/GreenLeaf/ViewGreenLeafForm'));
const EditRecordPage = lazy(() => import('./sideBar/GreenLeaf/EditRecordPage'));
const DehydratorRecordForm = lazy(() => import('./sideBar/Dehydrator/DehydratorRecordForm'));
const ViewDehydratorRecords = lazy(() => import('./sideBar/Dehydrator/ViewDehydratorRecords'));
const EditDehydratorRecord = lazy(() => import('./sideBar/Dehydrator/EditDehydratorRecord'));
const ProductionSummary = lazy(() => import('./sideBar/Summary/ProductionSummary'));
const SellingDetailsTable = lazy(() => import('./sideBar/Summary/SellingDetailsTable'));
const CostOfProduction = lazy(() => import('./sideBar/Summary/CostOfProduction'));
const RawMaterialCost = lazy(() => import('./sideBar/RawMaterial/RawMaterialCost'));
const ViewRawMaterialCost = lazy(() => import('./sideBar/RawMaterial/ViewRawMaterialCost'));
const EditRawMaterialCost = lazy(() => import('./sideBar/RawMaterial/EditRawMaterialCost'));
const TransOut = lazy(() => import("./sideBar/TransOut/TransOut"));
const ViewTransOutRecords = lazy(() => import("./sideBar/TransOut/ViewTransOutRecords"));
const LoftLeafCount = lazy(() => import("./sideBar/LoftLeafCount/LoftLeafCount"));
const ViewLoftLeafCount = lazy(() => import("./sideBar/LoftLeafCount/ViewLoftLeafCount"));
const EditLoftLeafCount = lazy(() => import("./sideBar/LoftLeafCount/EditLoftLeafCount"));
const SummaryLoftLeafCount = lazy(() => import("./sideBar/LoftLeafCount/WeightAverage"));
const SimpleAverage = lazy(() => import("./sideBar/LoftLeafCount/SimpleAverage"));

export const HandmadeRoutes = () => (
  <Route path="/" element={<DashboardLayout />}>
    <Route path="dashboard" element={<DashboardHome />} />
    <Route path="manage-users" element={<ManageUsers />} />
    <Route path="create-user" element={<CreateUserForm />} />
    <Route path="green-leaf-form" element={<GreenLeafForm />} />
    <Route path="view-green-leaf" element={<ViewGreenLeafForm />} />
    <Route path="edit-record" element={<EditRecordPage />} />
    <Route path="dehydrator-record-form" element={<DehydratorRecordForm />} />
    <Route path="view-dehydrator-records" element={<ViewDehydratorRecords />} />
    <Route path="edit-dehydrator" element={<EditDehydratorRecord />} />
    <Route path="production-summary" element={<ProductionSummary />} />
    <Route path="selling-details-table" element={<SellingDetailsTable />} />
    <Route path="cost-of-production" element={<CostOfProduction />} />
    <Route path="raw-material-cost" element={<RawMaterialCost />} />
    <Route path="view-raw-material-cost" element={<ViewRawMaterialCost />} />
    <Route path="edit-raw-material-cost" element={<EditRawMaterialCost />} />
    <Route path="transfer-out" element={<TransOut />} />
    <Route path="transfer-out-view" element={<ViewTransOutRecords />} />
    <Route path="loft-leaf-count" element={<LoftLeafCount />} />
    <Route path="view-loft-leaf" element={<ViewLoftLeafCount />} />
    <Route path="edit-loft-leaf" element={<EditLoftLeafCount />} />
    <Route path="summary-loft-leaf" element={<SummaryLoftLeafCount />} />
    <Route path="simple-average" element={<SimpleAverage />} />
  </Route>
);
