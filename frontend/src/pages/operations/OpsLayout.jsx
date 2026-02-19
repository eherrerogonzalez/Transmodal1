import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  Ship, 
  LayoutDashboard, 
  Package, 
  Calculator, 
  FileText, 
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const navItems = [
  { path: '/ops/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/ops/containers', icon: Package, label: 'Contenedores' },
  { path: '/ops/pricing', icon: Calculator, label: 'Pricing' },
  { path: '/ops/quotes', icon: FileText, label: 'Contratos' },
  { path: '/ops/suppliers', icon: Building2, label: 'Proveedores' },
  { path: '/ops/clients', icon: Users, label: 'Clientes' },
];

export default function OpsLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('ops_user');
    if (!userData) {
      navigate('/ops/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('ops_token');
    localStorage.removeItem('ops_user');
    navigate('/ops/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-6 border-b border-slate-700">
        <div className="w-10 h-10 bg-blue-600 rounded-sm flex items-center justify-center">
          <Ship className="w-6 h-6 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold text-white tracking-tight">Transmodal</h1>
            <p className="text-xs text-slate-400">Portal de Operaciones</p>
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
              `flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${
                isActive
                  ? 'text-white bg-blue-600/20 border-l-2 border-blue-500'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`
            }
            data-testid={`nav-ops-${item.path.split('/').pop()}`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-700 p-4">
        {!collapsed && user && (
          <div className="mb-4 animate-fade-in">
            <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        )}
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={`w-full text-slate-400 hover:text-white hover:bg-slate-800/50 ${
            collapsed ? 'justify-center px-2' : 'justify-start'
          }`}
          data-testid="ops-logout-btn"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="ml-3">Cerrar Sesión</span>}
        </Button>
      </div>

      {/* Collapse toggle - desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-white transition-colors"
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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-sm shadow-lg"
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
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 bg-slate-900 transition-all duration-200 ${
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
