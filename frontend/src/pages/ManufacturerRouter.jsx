import React, { lazy } from "react";
import { Route } from "react-router-dom";

const ManufacturerDashboardLayout = lazy(() => import("./Manufacturer/ManufacturerDashbordLayout"));
const ManufacturerDashboard = lazy(() => import("./Manufacturer/ManufacturerDashboard"));
const WitherLeafForm = lazy(() => import("./Manufacturer/BL Operation/WitherLeafForm"));
const FactoryLoftLeaf = lazy(() => import("./Manufacturer/LoftLeaf/FactoryLoftLeaf"));
const ViewLoftLeafCount = lazy(() => import("./Manufacturer/LoftLeaf/ViewFactoryLoftLeaf"));
const SimpleAverage = lazy(() => import("./Manufacturer/LoftLeaf/SimpleAverage"));
const WeightAverage = lazy(() => import("./Manufacturer/LoftLeaf/WeightAverage"));
const WitherLeafSummary = lazy(() => import("./Manufacturer/BL Operation/WitherLeafSummary"));
const DhoolRollingSection = lazy(() => import("./Manufacturer/BL Operation/DhoolRollingSection"));
const DhoolRollingSummary = lazy(() => import("./Manufacturer/BL Operation/DhoolRollingSummary"));
const WeeklyLoftLeafSummary = lazy(() => import("./Manufacturer/SummaryReport/WeeklyLoftLeafSummary"));
const CollectorQualityDiffReport = lazy(() => import("./Manufacturer/SummaryReport/CollectorQualityDiffReport"));
const FiringSectionForm = lazy(() => import("./Manufacturer/BL Operation/FiringSectionForm"));
const FiringSectionSummary = lazy(() => import("./Manufacturer/BL Operation/FiringSectionSummary"));
const HydroMetersEntry = lazy(() => import("./Manufacturer/BL Operation/HydroMeters/HydroMetersEntry"));
const HydroMetersView = lazy(() => import("./Manufacturer/BL Operation/HydroMeters/HydroMetersView"));
const GreenLeafMonthlyRanking = lazy(() => import("./Manufacturer/SummaryReport/GreenLeafMonthlyRanking"));
const TC5Report = lazy(() => import("./Manufacturer/TC5/TC5Report"));
const GreenLeafMonthlyReport = lazy(() => import("./Manufacturer/SummaryReport/GreenLeafMonthlyReport"));
const TC5ManualReport = lazy(() => import("./Manufacturer/TC5/TC5ManualReport"));
const BestLeafCountChart = lazy(() => import("./Manufacturer/SummaryReport/BestLeafCountChart"));

export default function ManufacturerRouter() {
  return (
    <Route path="/manufacturer" element={<ManufacturerDashboardLayout />}>
      <Route index element={<ManufacturerDashboard />} />
      <Route path="bl-production/witherLeafForm" element={<WitherLeafForm />} />
      <Route
        path="bl-production/witherLeafSummary"
        element={<WitherLeafSummary />}
      />
      <Route
        path="bl-production/dhoolRollingSection"
        element={<DhoolRollingSection />}
      />
      <Route
        path="bl-production/dhoolRollingSummary"
        element={<DhoolRollingSummary />}
      />
      <Route
        path="bl-production/firingSection"
        element={<FiringSectionForm />}
      />
      <Route
        path="bl-production/firingSectionSummary"
        element={<FiringSectionSummary />}
      />
      <Route
        path="bl-production/hydroMetersentry"
        element={<HydroMetersEntry />}
      />
      <Route
        path="bl-production/hydroMeterview"
        element={<HydroMetersView />}
      />

      <Route path="factory-loft-leaf" element={<FactoryLoftLeaf />} />
      <Route path="view-factory-loft-leaf" element={<ViewLoftLeafCount />} />
      <Route path="simple-avg-factory-loft-leaf" element={<SimpleAverage />} />
      <Route path="weight-avg-factory-loft-leaf" element={<WeightAverage />} />
      <Route
        path="weekly-loft-leaf-summary"
        element={<WeeklyLoftLeafSummary />}
      />
      <Route
        path="collector-quality-difference"
        element={<CollectorQualityDiffReport />}
      />
      <Route
        path="green-leaf-monthly-ranking"
        element={<GreenLeafMonthlyRanking />}
      />

      <Route
        path="best-collector-count-chart"
        element={<BestLeafCountChart />}
      />

      <Route path="tc5report" element={<TC5Report />} />
      <Route path="tc5manualreport" element={<TC5ManualReport />} />

      <Route
        path="green-leaf-monthly-report"
        element={<GreenLeafMonthlyReport />}
      />
    </Route>
  );
}
