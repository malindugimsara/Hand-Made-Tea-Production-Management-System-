import { Route } from "react-router-dom";

import DashboardHome from '../pages/sideBar/HandMadeDashbord';
import ManageUsers from '../pages/Users/ManageUsers';
import CreateUserForm from '../pages/Users/CreateUserForm';
import GreenLeafForm from '../pages/sideBar/GreenLeaf/GreenLeafForm';
import ViewGreenLeafForm from '../pages/sideBar/GreenLeaf/ViewGreenLeafForm';
import EditRecordPage from '../pages/sideBar/GreenLeaf/EditRecordPage';
import DehydratorRecordForm from '../pages/sideBar/Dehydrator/DehydratorRecordForm';
import ViewDehydratorRecords from '../pages/sideBar/Dehydrator/ViewDehydratorRecords';
import EditDehydratorRecord from '../pages/sideBar/Dehydrator/EditDehydratorRecord';
import ProductionSummary from '../pages/sideBar/Summary/ProductionSummary';
import SellingDetailsTable from '../pages/sideBar/Summary/SellingDetailsTable';
import CostOfProduction from '../pages/sideBar/Summary/CostOfProduction';
import RawMaterialCost from '../pages/sideBar/RawMaterial/RawMaterialCost';
import ViewRawMaterialCost from '../pages/sideBar/RawMaterial/ViewRawMaterialCost';
import EditRawMaterialCost from '../pages/sideBar/RawMaterial/EditRawMaterialCost';
import DashboardLayout from "./sideBar/DashboardLayout";
import TransOut from "./sideBar/TransOut/TransOut";
import ViewTransOutRecords from "./sideBar/TransOut/ViewTransOutRecords";

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


  </Route>
);