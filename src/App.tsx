/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { OperationsDashboard } from "./pages/OperationsDashboard";
import { ReceiverHealth } from "./pages/ReceiverHealth";
import { Analytics } from "./pages/Analytics";
import { IncidentsTable } from "./pages/IncidentsTable";
import { Replay } from "./pages/Replay";
import { Providers } from "./app/providers";

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
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
      </BrowserRouter>
    </Providers>
  );
}
