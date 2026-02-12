import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Search, 
  RefreshCw, 
  Filter,
  Ship,
  Train,
  Truck,
  Plus,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import api from '../../lib/api';

const MODE_ICONS = {
  maritime: Ship,
  rail: Train,
  intermodal: Truck,
  truck: Truck
};

const MODE_LABELS = {
  maritime: 'Marítimo',
  rail: 'Ferroviario',
  intermodal: 'Intermodal',
  truck: 'Terrestre'
};

export default function OpsPricing() {
  const [routes, setRoutes] = useState([]);
  const [services, setServices] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('routes');
  
  // Filters
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadRoutes();
    }
  }, [selectedOrigin, selectedDestination, selectedMode, selectedSize]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [routesRes, servicesRes, originsRes, destinationsRes] = await Promise.all([
        api.get('/ops/pricing/routes'),
        api.get('/ops/pricing/services'),
        api.get('/ops/pricing/origins'),
        api.get('/ops/pricing/destinations')
      ]);
      setRoutes(routesRes.data.routes);
      setServices(servicesRes.data.services);
      setOrigins(originsRes.data.origins);
      setDestinations(destinationsRes.data.destinations);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadRoutes = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedOrigin) params.append('origin', selectedOrigin);
      if (selectedDestination) params.append('destination', selectedDestination);
      if (selectedMode) params.append('transport_mode', selectedMode);
      if (selectedSize) params.append('container_size', selectedSize);
      
      const response = await api.get(`/ops/pricing/routes?${params.toString()}`);
      setRoutes(response.data.routes);
    } catch (error) {
      console.error(error);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(value);
  };

  const clearFilters = () => {
    setSelectedOrigin('');
    setSelectedDestination('');
    setSelectedMode('');
    setSelectedSize('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="ops-pricing">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pricing</h1>
          <p className="text-slate-500">Tarifas de rutas y servicios adicionales</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('routes')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'routes' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Rutas ({routes.length})
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'services' 
              ? 'border-blue-500 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Servicios Adicionales ({services.length})
        </button>
      </div>

      {/* Routes Tab */}
      {activeTab === 'routes' && (
        <>
          {/* Filters */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[150px]">
                  <label className="text-xs text-slate-500 mb-1 block">Origen</label>
                  <select
                    value={selectedOrigin}
                    onChange={(e) => setSelectedOrigin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos</option>
                    {origins.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-xs text-slate-500 mb-1 block">Destino</label>
                  <select
                    value={selectedDestination}
                    onChange={(e) => setSelectedDestination(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos</option>
                    {destinations.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-xs text-slate-500 mb-1 block">Modo</label>
                  <select
                    value={selectedMode}
                    onChange={(e) => setSelectedMode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="maritime">Marítimo</option>
                    <option value="rail">Ferroviario</option>
                    <option value="intermodal">Intermodal</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="text-xs text-slate-500 mb-1 block">Tamaño</label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="20ft">20ft</option>
                    <option value="40ft">40ft</option>
                    <option value="40ft HC">40ft HC</option>
                  </select>
                </div>
                <Button onClick={clearFilters} variant="outline" size="sm">
                  Limpiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Routes Table */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Modo</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Origen</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Destino</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Contenedor</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Costo</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Precio Sugerido</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Margen</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">Días</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Vigencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.slice(0, 50).map((route) => {
                      const Icon = MODE_ICONS[route.transport_mode] || Ship;
                      return (
                        <tr key={route.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-blue-100 rounded">
                                <Icon className="w-4 h-4 text-blue-600" />
                              </div>
                              <span className="text-xs text-slate-600">{MODE_LABELS[route.transport_mode]}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">{route.origin}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{route.destination}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                              {route.container_size}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-right text-slate-600">{formatCurrency(route.base_cost)}</td>
                          <td className="py-3 px-4 text-sm text-right font-medium text-slate-800">{formatCurrency(route.suggested_price)}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              route.margin_percent >= 25 ? 'bg-emerald-100 text-emerald-700' :
                              route.margin_percent >= 18 ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {route.margin_percent}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-slate-600">{route.transit_days}</td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {route.validity_start} - {route.validity_end}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id} className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">{service.code}</span>
                    <h3 className="font-semibold text-slate-800 mt-2">{service.name}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${service.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {service.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mb-4">{service.description}</p>
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400">Costo</p>
                    <p className="text-sm font-medium text-slate-600">{formatCurrency(service.base_cost)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Precio</p>
                    <p className="text-sm font-bold text-blue-600">{formatCurrency(service.suggested_price)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">Por: {service.unit.replace('_', ' ')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
