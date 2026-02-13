import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { MainLayout } from "./components/layout/MainLayout";
import { Toaster } from "./components/ui/sonner";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Containers from "./pages/Containers";
import ContainerMap from "./pages/ContainerMap";
import Additionals from "./pages/Additionals";
import AccountStatement from "./pages/AccountStatement";
import Planning from "./pages/Planning";
import Inventory from "./pages/Inventory";
import OrderConfirmations from "./pages/OrderConfirmations";
import CreateOrder from "./pages/CreateOrder";
import YardManagement from "./pages/YardManagement";

// Operations Portal
import OpsLogin from "./pages/operations/OpsLogin";
import OpsLayout from "./pages/operations/OpsLayout";
import OpsDashboard from "./pages/operations/OpsDashboard";
import OpsContainers from "./pages/operations/OpsContainers";
import OpsPricing from "./pages/operations/OpsPricing";
import OpsQuotes from "./pages/operations/OpsQuotes";
import OpsSuppliers from "./pages/operations/OpsSuppliers";
import OpsClients from "./pages/operations/OpsClients";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Operations Portal */}
          <Route path="/ops/login" element={<OpsLogin />} />
          <Route path="/ops" element={<OpsLayout />}>
            <Route path="dashboard" element={<OpsDashboard />} />
            <Route path="containers" element={<OpsContainers />} />
            <Route path="pricing" element={<OpsPricing />} />
            <Route path="quotes" element={<OpsQuotes />} />
            <Route index element={<Navigate to="/ops/dashboard" replace />} />
          </Route>
          
          {/* Protected routes */}
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/new" element={<CreateOrder />} />
            <Route path="/confirmations" element={<OrderConfirmations />} />
            <Route path="/containers" element={<Containers />} />
            <Route path="/map" element={<ContainerMap />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/yard" element={<YardManagement />} />
            <Route path="/additionals" element={<Additionals />} />
            <Route path="/account" element={<AccountStatement />} />
          </Route>
          
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
