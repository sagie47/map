/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Providers } from "./app/providers";

const OperationsDashboard = lazy(() => import("./pages/OperationsDashboard").then((module) => ({ default: module.OperationsDashboard })));
const ReceiverHealth = lazy(() => import("./pages/ReceiverHealth").then((module) => ({ default: module.ReceiverHealth })));
const Analytics = lazy(() => import("./pages/Analytics").then((module) => ({ default: module.Analytics })));
const IncidentsTable = lazy(() => import("./pages/IncidentsTable").then((module) => ({ default: module.IncidentsTable })));
const Replay = lazy(() => import("./pages/Replay").then((module) => ({ default: module.Replay })));

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Suspense fallback={<div className="p-6 text-sm text-zinc-500">Loading page…</div>}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/operations" replace />} />
              <Route path="operations" element={<OperationsDashboard />} />
              <Route path="incidents" element={<IncidentsTable />} />
              <Route path="health" element={<ReceiverHealth />} />
              <Route path="analytics" element={<Analytics />} />
            </Route>
            <Route path="/replay/:id" element={<Replay />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </Providers>
  );
}
