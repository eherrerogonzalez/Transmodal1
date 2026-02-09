import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Ship, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Por favor ingrese usuario y contraseña');
      return;
    }

    setIsLoading(true);
    
    const result = await login(username, password);
    
    if (result.success) {
      toast.success('Bienvenido a Transmodal');
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Error de autenticación');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-sm flex items-center justify-center">
              <Ship className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transmodal</h1>
              <p className="text-sm text-slate-500">Portal de Cliente</p>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm rounded-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">Iniciar Sesión</CardTitle>
              <CardDescription>
                Ingrese sus credenciales para acceder al portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                    Usuario
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Ingrese su usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 rounded-sm border-slate-200 focus:border-blue-600 focus:ring-blue-600"
                    data-testid="login-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    Contraseña
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Ingrese su contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-sm border-slate-200 focus:border-blue-600 focus:ring-blue-600"
                    data-testid="login-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-sm font-medium transition-colors"
                  disabled={isLoading}
                  data-testid="login-submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-slate-50 rounded-sm">
                <p className="text-xs text-slate-500 text-center">
                  <strong>Demo:</strong> Use cualquier usuario y contraseña para ingresar
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-slate-500">
            © 2025 Transmodal. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* Right side - Image */}
      <div 
        className="hidden lg:block lg:flex-1 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.3), rgba(15, 23, 42, 0.7)), url('https://images.unsplash.com/photo-1648583076906-60338fa01f07?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzN8MHwxfHNlYXJjaHwxfHxzaGlwcGluZyUyMGNvbnRhaW5lciUyMHNoaXAlMjBvY2VhbnxlbnwwfHx8fDE3NzA2Njg1MjV8MA&ixlib=rb-4.1.0&q=85')`
        }}
      >
        <div className="h-full flex flex-col justify-end p-12">
          <blockquote className="text-white">
            <p className="text-2xl font-semibold leading-tight mb-4">
              "Gestione sus contenedores de manera eficiente y mantenga el control total de su cadena logística."
            </p>
            <footer className="text-slate-300 text-sm">
              — Portal de Cliente Transmodal
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default Login;
