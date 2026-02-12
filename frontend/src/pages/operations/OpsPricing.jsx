import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  RefreshCw, 
  Ship,
  Train,
  Truck,
  Plus,
  X,
  Save,
  DollarSign,
  Users,
  ChevronDown,
  ChevronUp,
  Star,
  TrendingDown,
  TrendingUp,
  Building2
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

const SUPPLIER_TYPE_LABELS = {
  naviera: 'Naviera',
  ferroviaria: 'Ferroviaria',
  intermodal: 'Intermodal',
  transportista: 'Transportista'
};

export default function OpsPricing() {
  const [routes, setRoutes] = useState([]);
  const [services, setServices] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [suppliers, setSuppliers] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('routes');
  
  // Filters
  const [selectedOrigin, setSelectedOrigin] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [selectedMode, setSelectedMode] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  // Expanded rows
  const [expandedRoutes, setExpandedRoutes] = useState({});
  
  // Forms
  const [showNewRoute, setShowNewRoute] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(null); // route_id
  
  // New Route Form
  const [newRoute, setNewRoute] = useState({
    origin: '',
    destination: '',
    transport_mode: 'maritime',
    container_size: '40ft',
    container_type: 'dry',
    suggested_price: '',
    transit_days: '',
    notes: ''
  });

  // New Service Form
  const [newService, setNewService] = useState({
    code: '',
    name: '',
    description: '',
    unit: 'per_container',
    base_cost: '',
    suggested_price: ''
  });

  // New Supplier Quote Form
  const [newSupplier, setNewSupplier] = useState({
    supplier_name: '',
    supplier_type: 'naviera',
    cost: '',
    transit_days: '',
    contact_name: '',
    contact_email: '',
    notes: ''
  });

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
      const [routesRes, servicesRes, originsRes, destinationsRes, suppliersRes] = await Promise.all([
        api.get('/ops/pricing/routes'),
        api.get('/ops/pricing/services'),
        api.get('/ops/pricing/origins'),
        api.get('/ops/pricing/destinations'),
        api.get('/ops/pricing/suppliers')
      ]);
      setRoutes(routesRes.data.routes);
      setServices(servicesRes.data.services);
      setOrigins(originsRes.data.origins);
      setDestinations(destinationsRes.data.destinations);
      setSuppliers(suppliersRes.data.suppliers);
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

  const calculateMargin = (cost, price) => {
    const c = parseFloat(cost) || 0;
    const p = parseFloat(price) || 0;
    if (p <= 0) return 0;
    return ((p - c) / p * 100).toFixed(1);
  };

  const toggleRouteExpand = (routeId) => {
    setExpandedRoutes(prev => ({
      ...prev,
      [routeId]: !prev[routeId]
    }));
  };

  const handleAddSupplier = async (routeId) => {
    if (!newSupplier.supplier_name || !newSupplier.cost) {
      toast.error('Completa proveedor y costo');
      return;
    }

    try {
      const response = await api.post(`/ops/pricing/routes/${routeId}/suppliers`, newSupplier);
      
      // Update local state
      setRoutes(routes.map(r => r.id === routeId ? response.data.route : r));
      
      setNewSupplier({
        supplier_name: '',
        supplier_type: 'naviera',
        cost: '',
        transit_days: '',
        contact_name: '',
        contact_email: '',
        notes: ''
      });
      setShowAddSupplier(null);
      toast.success('Proveedor agregado');
    } catch (error) {
      toast.error('Error al agregar proveedor');
    }
  };

  const handleCreateRoute = () => {
    if (!newRoute.origin || !newRoute.destination || !newRoute.suggested_price) {
      toast.error('Completa los campos requeridos');
      return;
    }

    const route = {
      id: Date.now().toString(),
      ...newRoute,
      supplier_quotes: [],
      avg_cost: 0,
      min_cost: 0,
      max_cost: 0,
      best_supplier: null,
      suggested_price: parseFloat(newRoute.suggested_price),
      transit_days: parseInt(newRoute.transit_days) || 0,
      margin_percent: 100, // Sin costos aún
      validity_start: new Date().toISOString().split('T')[0],
      validity_end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      is_active: true
    };

    setRoutes([route, ...routes]);
    setNewRoute({
      origin: '',
      destination: '',
      transport_mode: 'maritime',
      container_size: '40ft',
      container_type: 'dry',
      suggested_price: '',
      transit_days: '',
      notes: ''
    });
    setShowNewRoute(false);
    toast.success('Ruta creada - Agrega proveedores para calcular costos');
  };

  const handleCreateService = () => {
    if (!newService.code || !newService.name || !newService.base_cost || !newService.suggested_price) {
      toast.error('Completa los campos requeridos');
      return;
    }

    const service = {
      id: Date.now().toString(),
      ...newService,
      base_cost: parseFloat(newService.base_cost),
      suggested_price: parseFloat(newService.suggested_price),
      is_active: true
    };

    setServices([service, ...services]);
    setNewService({
      code: '',
      name: '',
      description: '',
      unit: 'per_container',
      base_cost: '',
      suggested_price: ''
    });
    setShowNewService(false);
    toast.success('Servicio agregado correctamente');
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
          <p className="text-slate-500">Tarifario de compra y venta con proveedores</p>
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
          {/* Filters & Add Button */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[150px]">
                  <label className="text-xs text-slate-500 mb-1 block">Origen</label>
                  <select
                    value={selectedOrigin}
                    onChange={(e) => setSelectedOrigin(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
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
                <Button onClick={() => setShowNewRoute(true)} className="bg-blue-600 hover:bg-blue-700" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Nueva Ruta
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* New Route Form */}
          {showNewRoute && (
            <Card className="bg-white border-blue-200 shadow-sm border-2">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <Ship className="w-5 h-5 text-blue-500" />
                    Nueva Ruta
                  </CardTitle>
                  <button onClick={() => setShowNewRoute(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Origen *</label>
                    <Input
                      placeholder="Ej: Shanghai"
                      value={newRoute.origin}
                      onChange={(e) => setNewRoute({...newRoute, origin: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Destino *</label>
                    <Input
                      placeholder="Ej: Manzanillo"
                      value={newRoute.destination}
                      onChange={(e) => setNewRoute({...newRoute, destination: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Modo de Transporte</label>
                    <select
                      value={newRoute.transport_mode}
                      onChange={(e) => setNewRoute({...newRoute, transport_mode: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="maritime">Marítimo</option>
                      <option value="rail">Ferroviario</option>
                      <option value="intermodal">Intermodal</option>
                      <option value="truck">Terrestre</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Tamaño Contenedor</label>
                    <select
                      value={newRoute.container_size}
                      onChange={(e) => setNewRoute({...newRoute, container_size: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="20ft">20ft</option>
                      <option value="40ft">40ft</option>
                      <option value="40ft HC">40ft HC</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Precio de Venta (USD) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newRoute.suggested_price}
                        onChange={(e) => setNewRoute({...newRoute, suggested_price: e.target.value})}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Días de Tránsito</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newRoute.transit_days}
                      onChange={(e) => setNewRoute({...newRoute, transit_days: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Notas</label>
                    <Input
                      placeholder="Notas adicionales..."
                      value={newRoute.notes}
                      onChange={(e) => setNewRoute({...newRoute, notes: e.target.value})}
                    />
                  </div>
                </div>
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <strong>Nota:</strong> Después de crear la ruta, agrega proveedores para calcular el costo promedio y margen.
                </p>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setShowNewRoute(false)}>Cancelar</Button>
                  <Button onClick={handleCreateRoute} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" />
                    Crear Ruta
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Routes Table with Suppliers */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="w-10"></th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Modo</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Origen → Destino</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Contenedor</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">Proveedores</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Costo Min</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Costo Prom</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Costo Max</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Precio Venta</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Margen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.slice(0, 30).map((route) => {
                      const Icon = MODE_ICONS[route.transport_mode] || Ship;
                      const isExpanded = expandedRoutes[route.id];
                      
                      return (
                        <React.Fragment key={route.id}>
                          {/* Main Row */}
                          <tr className="border-b border-slate-100 hover:bg-blue-50/30 cursor-pointer" onClick={() => toggleRouteExpand(route.id)}>
                            <td className="py-3 px-2">
                              <button className="p-1 hover:bg-slate-200 rounded">
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100 rounded">
                                  <Icon className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-xs text-slate-600">{MODE_LABELS[route.transport_mode]}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm font-medium text-slate-700">{route.origin}</span>
                              <span className="text-slate-400 mx-2">→</span>
                              <span className="text-sm font-medium text-slate-700">{route.destination}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                                {route.container_size}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="text-sm font-medium text-slate-700">{route.supplier_quotes?.length || 0}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-right">
                              <span className="text-emerald-600 font-medium">{formatCurrency(route.min_cost)}</span>
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-medium text-slate-800">
                              {formatCurrency(route.avg_cost)}
                            </td>
                            <td className="py-3 px-4 text-sm text-right">
                              <span className="text-red-600 font-medium">{formatCurrency(route.max_cost)}</span>
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-bold text-blue-600">
                              {formatCurrency(route.suggested_price)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                route.margin_percent >= 25 ? 'bg-emerald-100 text-emerald-700' :
                                route.margin_percent >= 15 ? 'bg-blue-100 text-blue-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {route.margin_percent}%
                              </span>
                            </td>
                          </tr>
                          
                          {/* Expanded Suppliers Row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan="10" className="bg-slate-50 p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                                      <Building2 className="w-4 h-4 text-blue-500" />
                                      Tarifario de Compra - Proveedores
                                    </h4>
                                    <Button 
                                      size="sm" 
                                      onClick={(e) => { e.stopPropagation(); setShowAddSupplier(route.id); }}
                                      className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                      <Plus className="w-4 h-4 mr-1" />
                                      Agregar Proveedor
                                    </Button>
                                  </div>
                                  
                                  {/* Add Supplier Form */}
                                  {showAddSupplier === route.id && (
                                    <div className="p-4 bg-white border border-emerald-200 rounded-lg space-y-3">
                                      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                                        <div>
                                          <label className="text-xs text-slate-500 block mb-1">Proveedor *</label>
                                          <Input
                                            placeholder="Nombre"
                                            value={newSupplier.supplier_name}
                                            onChange={(e) => setNewSupplier({...newSupplier, supplier_name: e.target.value})}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-slate-500 block mb-1">Tipo</label>
                                          <select
                                            value={newSupplier.supplier_type}
                                            onChange={(e) => setNewSupplier({...newSupplier, supplier_type: e.target.value})}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                                          >
                                            <option value="naviera">Naviera</option>
                                            <option value="ferroviaria">Ferroviaria</option>
                                            <option value="transportista">Transportista</option>
                                            <option value="intermodal">Intermodal</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="text-xs text-slate-500 block mb-1">Costo (USD) *</label>
                                          <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={newSupplier.cost}
                                            onChange={(e) => setNewSupplier({...newSupplier, cost: e.target.value})}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-slate-500 block mb-1">Días Tránsito</label>
                                          <Input
                                            type="number"
                                            placeholder="0"
                                            value={newSupplier.transit_days}
                                            onChange={(e) => setNewSupplier({...newSupplier, transit_days: e.target.value})}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-slate-500 block mb-1">Contacto</label>
                                          <Input
                                            placeholder="Nombre contacto"
                                            value={newSupplier.contact_name}
                                            onChange={(e) => setNewSupplier({...newSupplier, contact_name: e.target.value})}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-slate-500 block mb-1">Email</label>
                                          <Input
                                            type="email"
                                            placeholder="email@proveedor.com"
                                            value={newSupplier.contact_email}
                                            onChange={(e) => setNewSupplier({...newSupplier, contact_email: e.target.value})}
                                            onClick={(e) => e.stopPropagation()}
                                          />
                                        </div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={(e) => { e.stopPropagation(); setShowAddSupplier(null); }}
                                        >
                                          Cancelar
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          onClick={(e) => { e.stopPropagation(); handleAddSupplier(route.id); }}
                                          className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                          Guardar Proveedor
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Suppliers List */}
                                  {route.supplier_quotes && route.supplier_quotes.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {route.supplier_quotes.map((sq) => (
                                        <div 
                                          key={sq.id} 
                                          className={`p-3 rounded-lg border ${sq.supplier_name === route.best_supplier ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}
                                        >
                                          <div className="flex items-start justify-between">
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-800">{sq.supplier_name}</span>
                                                {sq.supplier_name === route.best_supplier && (
                                                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                )}
                                              </div>
                                              <span className="text-xs text-slate-500">{SUPPLIER_TYPE_LABELS[sq.supplier_type] || sq.supplier_type}</span>
                                            </div>
                                            <span className={`text-lg font-bold ${sq.supplier_name === route.best_supplier ? 'text-emerald-600' : 'text-slate-700'}`}>
                                              {formatCurrency(sq.cost)}
                                            </span>
                                          </div>
                                          <div className="mt-2 flex gap-4 text-xs text-slate-500">
                                            <span>{sq.transit_days} días</span>
                                            {sq.contact_email && <span>{sq.contact_email}</span>}
                                          </div>
                                          <div className="mt-1 text-xs text-slate-400">
                                            Válido: {sq.validity_start} - {sq.validity_end}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-500 italic">Sin proveedores registrados</p>
                                  )}
                                  
                                  {/* Summary */}
                                  {route.supplier_quotes && route.supplier_quotes.length > 0 && (
                                    <div className="flex gap-6 pt-3 border-t border-slate-200 text-sm">
                                      <div className="flex items-center gap-2">
                                        <TrendingDown className="w-4 h-4 text-emerald-500" />
                                        <span className="text-slate-600">Mejor precio:</span>
                                        <span className="font-bold text-emerald-600">{formatCurrency(route.min_cost)}</span>
                                        <span className="text-slate-500">({route.best_supplier})</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Calculator className="w-4 h-4 text-blue-500" />
                                        <span className="text-slate-600">Promedio:</span>
                                        <span className="font-bold text-blue-600">{formatCurrency(route.avg_cost)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-red-500" />
                                        <span className="text-slate-600">Máximo:</span>
                                        <span className="font-bold text-red-600">{formatCurrency(route.max_cost)}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
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
        <>
          <div className="flex justify-end">
            <Button onClick={() => setShowNewService(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Servicio
            </Button>
          </div>

          {showNewService && (
            <Card className="bg-white border-blue-200 shadow-sm border-2">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-500" />
                    Nuevo Servicio Adicional
                  </CardTitle>
                  <button onClick={() => setShowNewService(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Código *</label>
                    <Input
                      placeholder="Ej: ALM001"
                      value={newService.code}
                      onChange={(e) => setNewService({...newService, code: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Nombre *</label>
                    <Input
                      placeholder="Ej: Almacenaje en Puerto"
                      value={newService.name}
                      onChange={(e) => setNewService({...newService, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Unidad de Cobro</label>
                    <select
                      value={newService.unit}
                      onChange={(e) => setNewService({...newService, unit: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="per_container">Por contenedor</option>
                      <option value="per_day">Por día</option>
                      <option value="per_ton">Por tonelada</option>
                      <option value="fixed">Fijo</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Descripción</label>
                  <Input
                    placeholder="Descripción del servicio..."
                    value={newService.description}
                    onChange={(e) => setNewService({...newService, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Costo Base (USD) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newService.base_cost}
                        onChange={(e) => setNewService({...newService, base_cost: e.target.value})}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Precio Sugerido (USD) *</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newService.suggested_price}
                        onChange={(e) => setNewService({...newService, suggested_price: e.target.value})}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Margen Calculado</label>
                    <div className={`px-3 py-2 rounded-lg text-center font-bold ${
                      parseFloat(calculateMargin(newService.base_cost, newService.suggested_price)) >= 40 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : parseFloat(calculateMargin(newService.base_cost, newService.suggested_price)) >= 20
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {calculateMargin(newService.base_cost, newService.suggested_price)}%
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setShowNewService(false)}>Cancelar</Button>
                  <Button onClick={handleCreateService} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Servicio
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

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
        </>
      )}
    </div>
  );
}
