import React, { lazy } from "react";
import { Route } from "react-router-dom";

const LocalSaleDashboard = lazy(() => import("./LocalSale/LocalSaleDashboard"));
const LocalSaleDashboardLayout = lazy(() => import("./LocalSale/LocalSaleDashbordLayout"));
const DailySummaryEntry = lazy(() => import("./LocalSale/Daily Summary/DailySummaryEntry"));
const ViewDailySummary = lazy(() => import("./LocalSale/Daily Summary/ViewdailySummary"));
const IssueTypeSummaryEntry = lazy(() => import("./LocalSale/Issue/IssueTypeSummaryEntry"));
const IssueTypeSummaryView = lazy(() => import("./LocalSale/Issue/IssueTypeSummaryView"));
const MonthEndSummary = lazy(() => import("./LocalSale/Monthly Summary/MonthEndSummary"));
const FreeIssueSummary = lazy(() => import("./LocalSale/Monthly Summary/FreeIssueSummary"));
const BalanceReport = lazy(() => import("./LocalSale/Monthly Summary/BalanceReport"));
const DailyExtendedStockView = lazy(() => import("./LocalSale/Monthly Summary/DailyExtendedStockView"));

export default function LocalSaleRouter() {
  return (
    <Route path="/localsale" element={<LocalSaleDashboardLayout />}>
      <Route index element={<LocalSaleDashboard />} />
      <Route path="dailysummary" element={<DailySummaryEntry />} />
      <Route path="viewdailysummary" element={<ViewDailySummary />} />
      <Route path="issuesummary" element={<IssueTypeSummaryEntry />} />
      <Route path="issuesummaryview" element={<IssueTypeSummaryView />} />
      <Route path="monthlysummaryview" element={<MonthEndSummary />} />
      <Route path="freeissuesummary" element={<FreeIssueSummary />} />
      <Route path="balancereport" element={<BalanceReport />} />
      <Route path="dailyextendedstock" element={<DailyExtendedStockView />} />
    </Route>
  );
}
