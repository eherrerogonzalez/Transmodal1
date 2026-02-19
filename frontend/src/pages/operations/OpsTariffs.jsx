import React, { useState, useEffect } from 'react';
import { 
  Package,
  Plus,
  X,
  Save,
  Trash2,
  Ship,
  Train,
  Truck,
  Search,
  Tag,
  TrendingUp,
  TrendingDown,
  Calculator,
  CheckCircle2,
  Edit,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  Copy,
  Pencil
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

// Componentes de costo predefinidos
const COST_TEMPLATES = [
  { id: 'flete_maritimo', name: 'Flete Marítimo', is_base: true },
  { id: 'flete_ferroviario', name: 'Flete Ferroviario', is_base: false },
  { id: 'ultima_milla', name: 'Última Milla', is_base: false },
  { id: 'maniobras_portuarias', name: 'Maniobras Terminal Portuaria', is_base: false },
  { id: 'maniobras_intermodal', name: 'Maniobras Terminal Intermodal', is_base: false },
  { id: 'despacho_aduanal', name: 'Despacho Aduanal', is_base: false },
  { id: 'seguro', name: 'Seguro de Carga', is_base: false },
  { id: 'almacenaje', name: 'Almacenaje Base', is_base: false },
];

// Servicios de venta predefinidos
const SALE_SERVICE_TEMPLATES = [
  { id: 'flete_door_to_door', name: 'Flete Door-to-Door', type: 'tarifa' },
  { id: 'flete_internacional', name: 'Flete Internacional', type: 'tarifa' },
  { id: 'flete_nacional', name: 'Flete Nacional', type: 'tarifa' },
  { id: 'despacho_aduanal', name: 'Despacho Aduanal', type: 'tarifa' },
  { id: 'maniobras', name: 'Maniobras y Handling', type: 'tarifa' },
  { id: 'seguro', name: 'Seguro de Carga', type: 'tarifa' },
];

export default function OpsTariffs() {
  const [tariffs, setTariffs] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedTariffs, setExpandedTariffs] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create form state
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [costComponents, setCostComponents] = useState([]);
  const [marginPercent, setMarginPercent] = useState(20);
  const [saleServices, setSaleServices] = useState([]);
  const [showCostSelector, setShowCostSelector] = useState(false);
  const [showSaleServiceSelector, setShowSaleServiceSelector] = useState(false);
  const [customCostName, setCustomCostName] = useState('');
  const [customServiceName, setCustomServiceName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tariffsRes, routesRes] = await Promise.all([
        api.get('/ops/pricing/tariffs'),
        api.get('/ops/pricing/routes')
      ]);
      setTariffs(tariffsRes.data.tariffs || []);
      setRoutes(routesRes.data.routes || []);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  // Filter routes for selector
  const filteredRoutes = routes.filter(route => {
    const search = routeSearchQuery.toLowerCase();
    return route.origin.toLowerCase().includes(search) ||
           route.destination.toLowerCase().includes(search);
  });

  // Filter tariffs for display
  const filteredTariffs = tariffs.filter(tariff => {
    const search = searchQuery.toLowerCase();
    return tariff.origin.toLowerCase().includes(search) ||
           tariff.destination.toLowerCase().includes(search);
  });

  // Select route from pricing
  const handleSelectRoute = (route) => {
    setSelectedRoute(route);
    setShowRouteSelector(false);
    
    // Initialize with base cost from route
    const initialCost = [{
      id: 'base_' + Date.now(),
      name: 'Flete Marítimo / Tarifa Base',
      amount: route.avg_cost || route.min_cost || 0,
      is_base: true
    }];
    setCostComponents(initialCost);
    
    toast.success('Ruta seleccionada');
  };

  // Add cost component
  const addCostComponent = (template, isCustom = false) => {
    const newCost = {
      id: (isCustom ? 'custom' : template.id) + '_' + Date.now(),
      name: isCustom ? customCostName : template.name,
      amount: 0,
      is_base: isCustom ? false : template.is_base
    };
    setCostComponents([...costComponents, newCost]);
    setShowCostSelector(false);
    setCustomCostName('');
  };

  // Update cost component
  const updateCostComponent = (id, amount) => {
    setCostComponents(costComponents.map(c => 
      c.id === id ? { ...c, amount: parseFloat(amount) || 0 } : c
    ));
  };

  // Remove cost component
  const removeCostComponent = (id) => {
    setCostComponents(costComponents.filter(c => c.id !== id));
  };

  // Add sale service
  const addSaleService = (template, isCustom = false) => {
    const newService = {
      id: (isCustom ? 'custom' : template.id) + '_' + Date.now(),
      name: isCustom ? customServiceName : template.name,
      type: isCustom ? 'tarifa' : template.type,
      amount: 0
    };
    setSaleServices([...saleServices, newService]);
    setShowSaleServiceSelector(false);
    setCustomServiceName('');
  };

  // Update sale service
  const updateSaleService = (id, field, value) => {
    setSaleServices(saleServices.map(s => 
      s.id === id ? { ...s, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : s
    ));
  };

  // Remove sale service
  const removeSaleService = (id) => {
    setSaleServices(saleServices.filter(s => s.id !== id));
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalCost = costComponents.reduce((sum, c) => sum + c.amount, 0);
    const salePriceSuggested = totalCost > 0 ? totalCost / (1 - marginPercent / 100) : 0;
    const totalSaleServices = saleServices.reduce((sum, s) => sum + s.amount, 0);
    const totalSale = totalSaleServices > 0 ? totalSaleServices : salePriceSuggested;
    const utility = totalSale - totalCost;
    const realMargin = totalSale > 0 ? (utility / totalSale * 100) : 0;
    
    return {
      totalCost,
      salePriceSuggested,
      totalSaleServices,
      totalSale,
      utility,
      realMargin
    };
  };

  // Auto-distribute sale services based on suggested price
  const autoDistributeSaleServices = () => {
    const totals = calculateTotals();
    if (totals.salePriceSuggested <= 0) {
      toast.error('Primero agrega costos para calcular el precio sugerido');
      return;
    }
    
    // Create default sale services
    const defaultServices = [
      { id: 'auto_flete_' + Date.now(), name: 'Flete Internacional', type: 'tarifa', amount: Math.round(totals.salePriceSuggested * 0.70) },
      { id: 'auto_despacho_' + Date.now(), name: 'Despacho Aduanal', type: 'tarifa', amount: Math.round(totals.salePriceSuggested * 0.12) },
      { id: 'auto_maniobras_' + Date.now(), name: 'Maniobras y Handling', type: 'tarifa', amount: Math.round(totals.salePriceSuggested * 0.18) },
    ];
    
    setSaleServices(defaultServices);
    toast.success('Servicios de venta generados automáticamente');
  };

  // Save tariff
  const handleSaveTariff = async () => {
    if (!selectedRoute) {
      toast.error('Selecciona una ruta');
      return;
    }
    if (costComponents.length === 0) {
      toast.error('Agrega al menos un costo');
      return;
    }

    const totals = calculateTotals();
    
    try {
      const tariffData = {
        route_id: selectedRoute.id,
        origin: selectedRoute.origin,
        destination: selectedRoute.destination,
        transport_mode: selectedRoute.transport_mode,
        container_size: selectedRoute.container_size,
        transit_days: selectedRoute.transit_days,
        cost_components: costComponents.map(c => ({
          name: c.name,
          amount: c.amount,
          is_base: c.is_base
        })),
        margin_percent: marginPercent,
        sale_services: saleServices.map(s => ({
          name: s.name,
          type: s.type,
          amount: s.amount
        }))
      };

      const response = await api.post('/ops/pricing/tariffs', tariffData);
      
      setTariffs([response.data.tariff, ...tariffs]);
      resetForm();
      setShowCreateForm(false);
      toast.success('Tarifa pre-aprobada creada exitosamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al crear tarifa');
    }
  };

  const resetForm = () => {
    setSelectedRoute(null);
    setCostComponents([]);
    setMarginPercent(20);
    setSaleServices([]);
  };

  const toggleTariffExpand = (id) => {
    setExpandedTariffs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Tarifas Pre-aprobadas
          </h2>
          <p className="text-sm text-slate-500">Paquetes de tarifas listos para cotizar</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="w-4 h-4 mr-1" />
          Nueva Tarifa
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="bg-white border-purple-200 border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-purple-800">Crear Tarifa Pre-aprobada</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowCreateForm(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Route Selection */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">1. Seleccionar Ruta del Pricing *</label>
              {selectedRoute ? (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{selectedRoute.origin} → {selectedRoute.destination}</p>
                    <p className="text-sm text-slate-500">{selectedRoute.transport_mode} • {selectedRoute.container_size} • {selectedRoute.transit_days} días</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-sm text-slate-500">Costo promedio: <strong className="text-blue-600">{formatCurrency(selectedRoute.avg_cost || selectedRoute.min_cost)}</strong></span>
                    <Button size="sm" variant="outline" onClick={() => setShowRouteSelector(true)}>
                      Cambiar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setShowRouteSelector(true)} variant="outline" className="w-full h-20 border-dashed">
                  <Ship className="w-5 h-5 mr-2 text-slate-400" />
                  Seleccionar Ruta del Pricing
                </Button>
              )}
            </div>

            {/* Cost Components */}
            {selectedRoute && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-700">2. Definir Costos</label>
                  <Button size="sm" onClick={() => setShowCostSelector(true)} variant="outline" className="border-red-300 text-red-600">
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar Costo
                  </Button>
                </div>
                <div className="space-y-2">
                  {costComponents.map((cost) => (
                    <div key={cost.id} className={`p-3 rounded-lg border flex justify-between items-center ${
                      cost.is_base ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700">{cost.name}</span>
                        {cost.is_base && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Base</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={cost.amount}
                          onChange={(e) => updateCostComponent(cost.id, e.target.value)}
                          className="w-32 text-right h-8"
                          placeholder="0.00"
                        />
                        <span className="text-red-600 font-medium w-28 text-right">{formatCurrency(cost.amount)}</span>
                        <button onClick={() => removeCostComponent(cost.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {costComponents.length > 0 && (
                    <div className="p-3 bg-red-100 rounded-lg border border-red-200 flex justify-between items-center">
                      <span className="text-red-800 font-bold">Total Costos:</span>
                      <span className="text-red-700 font-bold text-lg">{formatCurrency(totals.totalCost)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Margin */}
            {selectedRoute && totals.totalCost > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">3. Margen de Utilidad</label>
                <div className="flex gap-2">
                  {[30, 25, 20, 15].map((m) => (
                    <button
                      key={m}
                      onClick={() => setMarginPercent(m)}
                      className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                        marginPercent === m
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {m}%
                    </button>
                  ))}
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Precio de venta sugerido: <strong className="text-purple-600">{formatCurrency(totals.salePriceSuggested)}</strong>
                </p>
              </div>
            )}

            {/* Sale Services */}
            {selectedRoute && totals.totalCost > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-slate-700">4. Servicios de Venta (desglose para el cliente)</label>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={autoDistributeSaleServices} variant="outline" className="border-purple-300 text-purple-600">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Auto-generar
                    </Button>
                    <Button size="sm" onClick={() => setShowSaleServiceSelector(true)} variant="outline" className="border-emerald-300 text-emerald-600">
                      <Plus className="w-3 h-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </div>
                
                {saleServices.length === 0 ? (
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                    <p className="text-emerald-600 text-sm">Agrega servicios de venta o usa "Auto-generar" para crear automáticamente</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {saleServices.map((service) => (
                      <div key={service.id} className={`p-3 rounded-lg border flex justify-between items-center ${
                        service.type === 'tarifa' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700">{service.name}</span>
                          <button
                            onClick={() => updateSaleService(service.id, 'type', service.type === 'tarifa' ? 'extra' : 'tarifa')}
                            className={`px-2 py-0.5 rounded text-xs cursor-pointer ${
                              service.type === 'tarifa' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {service.type === 'tarifa' ? 'Tarifa' : 'Extra'} ↔
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={service.amount}
                            onChange={(e) => updateSaleService(service.id, 'amount', e.target.value)}
                            className="w-32 text-right h-8"
                            placeholder="0.00"
                          />
                          <span className="text-emerald-600 font-medium w-28 text-right">{formatCurrency(service.amount)}</span>
                          <button onClick={() => removeSaleService(service.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="p-3 bg-emerald-100 rounded-lg border border-emerald-200 flex justify-between items-center">
                      <span className="text-emerald-800 font-bold">Total Venta:</span>
                      <span className="text-emerald-700 font-bold text-lg">{formatCurrency(totals.totalSaleServices || totals.salePriceSuggested)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {selectedRoute && totals.totalCost > 0 && (
              <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg text-white">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Resumen de la Tarifa
                </h4>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-slate-400 text-xs">Total Costo</p>
                    <p className="text-lg font-bold text-red-400">{formatCurrency(totals.totalCost)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Precio Venta</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(totals.totalSale)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Utilidad</p>
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(totals.utility)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Margen Real</p>
                    <p className={`text-lg font-bold ${totals.realMargin >= marginPercent ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {totals.realMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => { setShowCreateForm(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveTariff} 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={!selectedRoute || totals.totalCost === 0}
              >
                <Save className="w-4 h-4 mr-1" />
                Guardar Tarifa
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tariffs List */}
      {!showCreateForm && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por origen o destino..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tariffs Grid */}
          {filteredTariffs.length === 0 ? (
            <Card className="bg-white border-slate-200">
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No hay tarifas pre-aprobadas</p>
                <Button onClick={() => setShowCreateForm(true)} className="mt-4" variant="outline">
                  Crear Primera Tarifa
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredTariffs.map((tariff) => {
                const ModeIcon = MODE_ICONS[tariff.transport_mode] || Ship;
                const isExpanded = expandedTariffs[tariff.id];
                
                return (
                  <Card key={tariff.id} className="bg-white border-slate-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      {/* Main Row */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <ModeIcon className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{tariff.origin} → {tariff.destination}</p>
                            <p className="text-sm text-slate-500">
                              {MODE_LABELS[tariff.transport_mode]} • {tariff.container_size} • {tariff.transit_days} días
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Costo</p>
                            <p className="font-medium text-red-600">{formatCurrency(tariff.total_cost)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Venta</p>
                            <p className="font-bold text-emerald-600 text-lg">{formatCurrency(tariff.total_sale || tariff.sale_price)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Margen</p>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                              tariff.margin_percent >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {tariff.margin_percent}%
                            </span>
                          </div>
                          <button onClick={() => toggleTariffExpand(tariff.id)} className="text-slate-400 hover:text-slate-600">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                          {/* Costs */}
                          <div className="p-3 bg-red-50 rounded-lg">
                            <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                              <TrendingDown className="w-4 h-4" /> Costos
                            </p>
                            <div className="space-y-1">
                              {tariff.cost_components?.map((comp, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-slate-600">{comp.name}</span>
                                  <span className="text-red-600">{formatCurrency(comp.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Sale Services */}
                          <div className="p-3 bg-emerald-50 rounded-lg">
                            <p className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-1">
                              <TrendingUp className="w-4 h-4" /> Desglose Venta
                            </p>
                            <div className="space-y-1">
                              {tariff.sale_services?.map((svc, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-slate-600">
                                    <span className={`px-1 py-0.5 rounded text-xs mr-1 ${
                                      svc.type === 'tarifa' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                                    }`}>
                                      {svc.type === 'tarifa' ? 'T' : 'E'}
                                    </span>
                                    {svc.name}
                                  </span>
                                  <span className="text-emerald-600">{formatCurrency(svc.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Route Selector Modal */}
      {showRouteSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Seleccionar Ruta del Pricing</h3>
              <button onClick={() => setShowRouteSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por origen o destino..."
                  value={routeSearchQuery}
                  onChange={(e) => setRouteSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[55vh]">
              <div className="grid gap-2">
                {filteredRoutes.map((route) => {
                  const ModeIcon = MODE_ICONS[route.transport_mode] || Ship;
                  const isIMO = route.container_type === 'imo';
                  const hasReturn = route.notes?.includes('CON retorno');
                  return (
                    <div
                      key={route.id}
                      onClick={() => handleSelectRoute(route)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        isIMO 
                          ? 'border-amber-200 hover:bg-amber-50 hover:border-amber-300' 
                          : 'border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <ModeIcon className="w-5 h-5 text-slate-400" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-800">{route.origin} → {route.destination}</p>
                              {isIMO && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">IMO</span>
                              )}
                              {hasReturn && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">+Retorno</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{MODE_LABELS[route.transport_mode]} • {route.container_size} • {route.transit_days} días</p>
                            {route.notes && (
                              <p className="text-xs text-slate-400 mt-1">{route.notes.split('.')[0]}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Costo</p>
                          <p className="font-bold text-blue-600">{formatCurrency(route.avg_cost || route.min_cost || 0)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Selector Modal */}
      {showCostSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[60vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-red-50">
              <h3 className="font-semibold text-red-800">Agregar Concepto de Costo</h3>
              <button onClick={() => setShowCostSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[40vh]">
              <div className="grid gap-2">
                {COST_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => addCostComponent(template)}
                    className="p-3 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-300 cursor-pointer"
                  >
                    {template.name}
                  </div>
                ))}
              </div>
              <div className="pt-4 mt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Costo personalizado:</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del costo..."
                    value={customCostName}
                    onChange={(e) => setCustomCostName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={() => customCostName && addCostComponent(null, true)} disabled={!customCostName}>
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sale Service Selector Modal */}
      {showSaleServiceSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[60vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-emerald-50">
              <h3 className="font-semibold text-emerald-800">Agregar Servicio de Venta</h3>
              <button onClick={() => setShowSaleServiceSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[40vh]">
              <div className="grid gap-2">
                {SALE_SERVICE_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => addSaleService(template)}
                    className="p-3 border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer flex justify-between items-center"
                  >
                    <span>{template.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      template.type === 'tarifa' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {template.type === 'tarifa' ? 'Tarifa' : 'Extra'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-4 mt-4 border-t border-slate-200">
                <p className="text-sm text-slate-500 mb-2">Servicio personalizado:</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del servicio..."
                    value={customServiceName}
                    onChange={(e) => setCustomServiceName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={() => customServiceName && addSaleService(null, true)} disabled={!customServiceName}>
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
