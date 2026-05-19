import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Meters from "./pages/Meters";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import AnalyzeFeeder from "./pages/AnalyzeFeeder";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="meters" element={<Meters />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        <Route path="analyze" element={<AnalyzeFeeder />} />
      </Route>
    </Routes>
  );
}
