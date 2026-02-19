import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Ship, 
  Building2, 
  Warehouse, 
  Truck,
  User,
  Lock,
  ArrowRight,
  X,
  Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import api from '../lib/api';

const PLATFORMS = [
  {
    id: 'client',
    name: 'Portal de Cliente',
    description: 'Gestiona tus pedidos, contenedores y estado de cuenta',
    icon: Ship,
    color: 'from-blue-500 to-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverColor: 'hover:border-blue-400',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    route: '/dashboard',
    loginEndpoint: '/auth/login'
  },
  {
    id: 'operations',
    name: 'Portal de Operaciones',
    description: 'Dashboard de rentabilidad, pricing y contratos',
    icon: Building2,
    color: 'from-slate-700 to-slate-900',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    hoverColor: 'hover:border-slate-400',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-700',
    route: '/ops/dashboard',
    loginEndpoint: '/ops/auth/login'
  },
  {
    id: 'wms',
    name: 'WMS - Almacén',
    description: 'Gestión de inventario, ubicaciones y movimientos',
    icon: Warehouse,
    color: 'from-emerald-500 to-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    hoverColor: 'hover:border-emerald-400',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    route: '/wms/dashboard',
    loginEndpoint: '/wms/auth/login'
  },
  {
    id: 'transport',
    name: 'Operador de Transporte',
    description: 'Asignación de unidades, rutas y seguimiento GPS',
    icon: Truck,
    color: 'from-amber-500 to-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    hoverColor: 'hover:border-amber-400',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    route: '/transport/dashboard',
    loginEndpoint: '/transport/auth/login'
  }
];

export default function Home() {
  const navigate = useNavigate();
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setUsername('');
    setPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Ingresa usuario y contraseña');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post(selectedPlatform.loginEndpoint, {
        username,
        password
      });

      if (response.data.token) {
        // Store token based on platform
        const tokenKey = selectedPlatform.id === 'client' ? 'token' : `${selectedPlatform.id}_token`;
        const userKey = selectedPlatform.id === 'client' ? 'user' : `${selectedPlatform.id}_user`;
        
        localStorage.setItem(tokenKey, response.data.token);
        localStorage.setItem(userKey, JSON.stringify(response.data.user));
        
        // Also store ops tokens with correct keys for backward compatibility
        if (selectedPlatform.id === 'operations') {
          localStorage.setItem('ops_token', response.data.token);
          localStorage.setItem('ops_user', JSON.stringify(response.data.user));
        }
        
        toast.success(`Bienvenido a ${selectedPlatform.name}`);
        navigate(selectedPlatform.route);
      }
    } catch (error) {
      toast.error('Credenciales incorrectas');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedPlatform(null);
    setUsername('');
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="py-6 px-8">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Ship className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Transmodal</h1>
                <p className="text-sm text-slate-400">Sistema Integral de Logística</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="max-w-6xl w-full">
            {/* Title */}
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Bienvenido al Portal
              </h2>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                Selecciona la plataforma a la que deseas acceder. Un solo usuario, múltiples herramientas.
              </p>
            </div>

            {/* Platform cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformSelect(platform)}
                    className={`group relative p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl text-left transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] hover:shadow-2xl`}
                    data-testid={`platform-${platform.id}`}
                  >
                    {/* Gradient accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${platform.color} rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                    
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 bg-gradient-to-br ${platform.color} rounded-xl flex items-center justify-center shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors">
                          {platform.name}
                        </h3>
                        <p className="text-slate-400 text-sm">
                          {platform.description}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer info */}
            <div className="mt-12 text-center">
              <p className="text-slate-500 text-sm">
                Usuario demo: <span className="text-slate-300 font-mono">operaciones</span> / <span className="text-slate-300 font-mono">ops123</span>
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-8 border-t border-white/10">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-slate-500 text-sm">
              © 2025 Transmodal. Sistema Integral de Logística y Cadena de Suministro.
            </p>
          </div>
        </footer>
      </div>

      {/* Login Modal */}
      {selectedPlatform && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal header with gradient */}
            <div className={`bg-gradient-to-r ${selectedPlatform.color} p-6`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <selectedPlatform.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedPlatform.name}</h3>
                    <p className="text-white/80 text-sm">Iniciar sesión</p>
                  </div>
                </div>
                <button 
                  onClick={closeModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Login form */}
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <User className="w-4 h-4 inline-block mr-2" />
                  Usuario
                </label>
                <Input
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12"
                  data-testid="modal-username"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Lock className="w-4 h-4 inline-block mr-2" />
                  Contraseña
                </label>
                <Input
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12"
                  data-testid="modal-password"
                />
              </div>

              <Button
                type="submit"
                className={`w-full h-12 bg-gradient-to-r ${selectedPlatform.color} hover:opacity-90 text-white font-medium`}
                disabled={isLoading}
                data-testid="modal-submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    Ingresar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-500 text-center">
                  Demo: <span className="font-mono text-slate-700">operaciones</span> / <span className="font-mono text-slate-700">ops123</span>
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
