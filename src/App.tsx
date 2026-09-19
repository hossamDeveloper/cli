import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "./components/Layout";
import CustomersPage from "./pages/CustomersPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import { initStorage } from "./data/storage";
import { seedDefaultCustomerTypes } from "./data/customersStorage";
import { useReminderChecker } from "./hooks/useReminderChecker";

export default function App() {
  useEffect(() => {
    initStorage();
    seedDefaultCustomerTypes();
  }, []);
  useReminderChecker();

  return (
    <>
      <Toaster position="top-center" richColors dir="rtl" />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/" element={<Navigate to="/customers" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/customers" replace />} />
      </Routes>
    </>
  );
}
