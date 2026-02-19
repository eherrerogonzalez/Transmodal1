import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { MainLayout } from "./components/layout/MainLayout";
import { Toaster } from "./components/ui/sonner";

// Pages
import Home from "./pages/Home";
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

// WMS Portal
import WmsLayout from "./pages/wms/WmsLayout";
import WmsDashboard from "./pages/wms/WmsDashboard";
import WmsInventory from "./pages/wms/WmsInventory";
import WmsLocations from "./pages/wms/WmsLocations";
import WmsMovements from "./pages/wms/WmsMovements";

// Transport Portal
import TransportLayout from "./pages/transport/TransportLayout";
import TransportDashboard from "./pages/transport/TransportDashboard";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Home - Platform selector */}
          <Route path="/" element={<Home />} />
          
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Operations Portal */}
          <Route path="/ops/login" element={<OpsLogin />} />
          <Route path="/ops" element={<OpsLayout />}>
            <Route path="dashboard" element={<OpsDashboard />} />
            <Route path="containers" element={<OpsContainers />} />
            <Route path="pricing" element={<OpsPricing />} />
            <Route path="quotes" element={<OpsQuotes />} />
            <Route path="suppliers" element={<OpsSuppliers />} />
            <Route path="clients" element={<OpsClients />} />
            <Route index element={<Navigate to="/ops/dashboard" replace />} />
          </Route>
          
          {/* WMS Portal */}
          <Route path="/wms" element={<WmsLayout />}>
            <Route path="dashboard" element={<WmsDashboard />} />
            <Route path="inventory" element={<WmsInventory />} />
            <Route path="locations" element={<WmsLocations />} />
            <Route path="movements" element={<WmsMovements />} />
            <Route path="tasks" element={<WmsDashboard />} />
            <Route path="reports" element={<WmsDashboard />} />
            <Route index element={<Navigate to="/wms/dashboard" replace />} />
          </Route>
          
          {/* Transport Portal */}
          <Route path="/transport" element={<TransportLayout />}>
            <Route path="dashboard" element={<TransportDashboard />} />
            <Route path="units" element={<TransportDashboard />} />
            <Route path="drivers" element={<TransportDashboard />} />
            <Route path="routes" element={<TransportDashboard />} />
            <Route path="tracking" element={<TransportDashboard />} />
            <Route path="fuel" element={<TransportDashboard />} />
            <Route index element={<Navigate to="/transport/dashboard" replace />} />
          </Route>
          
          {/* Client Portal - Protected routes */}
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
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}

export default App;
