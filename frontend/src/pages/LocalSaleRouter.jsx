import { Route } from "react-router-dom";
import LocalSaleDashboard from "./LocalSale/LocalSaleDashboard";
import LocalSaleDashboardLayout from "./LocalSale/LocalSaleDashbordLayout";
import DailySummaryEntry from "./LocalSale/Daily Summary/DailySummaryEntry";
import ViewDailySummary from "./LocalSale/Daily Summary/ViewdailySummary";
import IssueTypeSummaryEntry from "./LocalSale/Issue/IssueTypeSummaryEntry";
import IssueTypeSummaryView from "./LocalSale/Issue/IssueTypeSummaryView";
import MonthEndSummary from "./LocalSale/Monthly Summary/MonthEndSummary";
import FreeIssueSummary from "./LocalSale/Monthly Summary/FreeIssueSummary";


export default function   LocalSaleRouter() {
  return (
    <Route path="/localsale" element={<LocalSaleDashboardLayout />}>
      <Route index element={<LocalSaleDashboard />} />
      <Route path="dailysummary" element={<DailySummaryEntry />} />
      <Route path="viewdailysummary" element={<ViewDailySummary />} />
      <Route path="issuesummary" element={<IssueTypeSummaryEntry />} />
      <Route path="issuesummaryview" element={<IssueTypeSummaryView />} />
      <Route path="monthlysummaryview" element={<MonthEndSummary />} />
      <Route path="freeissuesummary" element={<FreeIssueSummary />} />


    </Route>
  );
}