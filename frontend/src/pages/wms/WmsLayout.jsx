import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  Warehouse, 
  LayoutDashboard, 
  Package, 
  MapPin, 
  ArrowLeftRight,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const navItems = [
  { path: '/wms/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/wms/inventory', icon: Package, label: 'Inventario' },
  { path: '/wms/locations', icon: MapPin, label: 'Ubicaciones' },
  { path: '/wms/movements', icon: ArrowLeftRight, label: 'Movimientos' },
  { path: '/wms/tasks', icon: ClipboardList, label: 'Tareas' },
  { path: '/wms/reports', icon: BarChart3, label: 'Reportes' },
];

export default function WmsLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('wms_user');
    if (!userData) {
      navigate('/');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('wms_token');
    localStorage.removeItem('wms_user');
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-emerald-700">
        <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
          <Warehouse className="w-6 h-6 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold text-white tracking-tight">Transmodal</h1>
            <p className="text-xs text-emerald-300">WMS - Almacén</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'text-white bg-emerald-600/30 border-l-2 border-emerald-400'
                  : 'text-emerald-200 hover:text-white hover:bg-emerald-700/30'
              }`
            }
            data-testid={`nav-wms-${item.path.split('/').pop()}`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-emerald-700 p-4">
        {!collapsed && user && (
          <div className="mb-4 animate-fade-in">
            <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
            <p className="text-xs text-emerald-300 truncate">{user.email}</p>
          </div>
        )}
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={`w-full text-emerald-200 hover:text-white hover:bg-emerald-700/50 ${
            collapsed ? 'justify-center px-2' : 'justify-start'
          }`}
          data-testid="wms-logout-btn"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Cerrar Sesión</span>}
        </Button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-emerald-600 rounded-full items-center justify-center text-white hover:bg-emerald-500 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-emerald-800 text-white rounded-lg shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-emerald-800 transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-emerald-200 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 bg-emerald-800 transition-all duration-200 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className={`transition-all duration-200 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="p-6 md:p-8 lg:p-10 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
