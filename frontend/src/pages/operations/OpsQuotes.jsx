import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2,
  Download,
  Check,
  X,
  Ship,
  User,
  Mail,
  Phone,
  Calculator,
  TrendingUp,
  TrendingDown,
  Percent,
  AlertCircle,
  MapPin,
  Tag,
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import api from '../../lib/api';

const STATUS_LABELS = {
  draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  sent: { label: 'Enviada', color: 'bg-blue-100 text-blue-600' },
  accepted: { label: 'Aceptada', color: 'bg-emerald-100 text-emerald-600' },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-600' },
  expired: { label: 'Expirada', color: 'bg-amber-100 text-amber-600' }
};

const MARGIN_OPTIONS = [
  { value: 30, label: '30%', color: 'bg-emerald-600' },
  { value: 25, label: '25%', color: 'bg-emerald-500' },
  { value: 20, label: '20%', color: 'bg-blue-500' },
  { value: 15, label: '15%', color: 'bg-amber-500' }
];

// Conceptos de COSTO predefinidos por ruta
const COST_COMPONENTS = [
  { id: 'tarifa_base', name: 'Tarifa Base / Flete Marítimo', required: true },
  { id: 'flete_ferroviario', name: 'Flete Ferroviario', required: false },
  { id: 'flete_terrestre', name: 'Flete Terrestre / Última Milla', required: false },
  { id: 'maniobras_portuarias', name: 'Maniobras Terminal Portuaria', required: false },
  { id: 'maniobras_intermodal', name: 'Maniobras Terminal Intermodal', required: false },
  { id: 'despacho_aduanal', name: 'Despacho Aduanal', required: false },
  { id: 'seguro', name: 'Seguro de Carga', required: false },
  { id: 'almacenaje', name: 'Almacenaje', required: false },
  { id: 'documentacion', name: 'Gestión Documental', required: false },
];

// Servicios de VENTA que se pueden agregar
const SALE_SERVICES = [
  { id: 'flete_internacional', name: 'Flete Internacional', defaultType: 'tarifa' },
  { id: 'flete_nacional', name: 'Flete Nacional', defaultType: 'tarifa' },
  { id: 'despacho_aduanal', name: 'Despacho Aduanal', defaultType: 'tarifa' },
  { id: 'maniobras', name: 'Maniobras', defaultType: 'tarifa' },
  { id: 'seguro', name: 'Seguro de Carga', defaultType: 'tarifa' },
  { id: 'almacenaje', name: 'Almacenaje', defaultType: 'extra' },
  { id: 'demoras', name: 'Demoras', defaultType: 'extra' },
  { id: 'inspeccion', name: 'Inspección', defaultType: 'extra' },
  { id: 'fumigacion', name: 'Fumigación', defaultType: 'extra' },
  { id: 'revalidacion', name: 'Revalidación', defaultType: 'extra' },
  { id: 'custodia', name: 'Custodia', defaultType: 'extra' },
  { id: 'previo', name: 'Previo', defaultType: 'extra' },
];

export default function OpsQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const printRef = useRef();
  
  // Client info
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Route
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  
  // COSTS - Predefined by route
  const [costItems, setCostItems] = useState([]);
  const [showCostSelector, setShowCostSelector] = useState(false);
  
  // SALES - Services to charge client
  const [saleItems, setSaleItems] = useState([]);
  const [showSaleSelector, setShowSaleSelector] = useState(false);
  const [customSaleName, setCustomSaleName] = useState('');
  
  // Margin
  const [selectedMargin, setSelectedMargin] = useState(25);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotesRes, routesRes] = await Promise.all([
        api.get('/ops/quotes'),
        api.get('/ops/pricing/routes')
      ]);
      setQuotes(quotesRes.data.quotes);
      setRoutes(routesRes.data.routes);
    } catch (error) {
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
    }).format(value);
  };

  // Select route and initialize cost items
  const selectRoute = (route) => {
    setSelectedRoute(route);
    
    // Initialize cost items with tarifa base from route
    const initialCosts = [
      {
        id: 'tarifa_base_' + Date.now(),
        concept_id: 'tarifa_base',
        name: 'Tarifa Base / Flete Marítimo',
        amount: route.avg_cost || route.min_cost || 0,
        required: true
      }
    ];
    setCostItems(initialCosts);
    
    setShowRouteSelector(false);
    toast.success('Ruta seleccionada - Agrega los costos de la operación');
  };

  // Add cost item
  const addCostItem = (concept) => {
    const exists = costItems.find(c => c.concept_id === concept.id);
    if (exists) {
      toast.error('Este concepto ya está agregado');
      return;
    }
    
    const newItem = {
      id: concept.id + '_' + Date.now(),
      concept_id: concept.id,
      name: concept.name,
      amount: 0,
      required: concept.required
    };
    setCostItems([...costItems, newItem]);
    setShowCostSelector(false);
    toast.success('Costo agregado');
  };

  // Add custom cost
  const addCustomCost = (name) => {
    const newItem = {
      id: 'custom_' + Date.now(),
      concept_id: 'custom',
      name: name,
      amount: 0,
      required: false
    };
    setCostItems([...costItems, newItem]);
    setShowCostSelector(false);
  };

  // Update cost
  const updateCostItem = (itemId, amount) => {
    setCostItems(costItems.map(item => 
      item.id === itemId ? { ...item, amount: parseFloat(amount) || 0 } : item
    ));
  };

  // Remove cost
  const removeCostItem = (itemId) => {
    const item = costItems.find(c => c.id === itemId);
    if (item?.required) {
      toast.error('No se puede eliminar la tarifa base');
      return;
    }
    setCostItems(costItems.filter(c => c.id !== itemId));
  };

  // Add sale item
  const addSaleItem = (service, isCustom = false, type = 'tarifa') => {
    const newItem = {
      id: (isCustom ? 'custom' : service.id) + '_' + Date.now(),
      service_id: isCustom ? 'custom' : service.id,
      name: isCustom ? customSaleName : service.name,
      type: isCustom ? type : service.defaultType, // 'tarifa' or 'extra'
      amount: 0
    };
    setSaleItems([...saleItems, newItem]);
    setShowSaleSelector(false);
    setCustomSaleName('');
    toast.success('Servicio agregado');
  };

  // Update sale item
  const updateSaleItem = (itemId, field, value) => {
    setSaleItems(saleItems.map(item => 
      item.id === itemId ? { ...item, [field]: field === 'amount' ? parseFloat(value) || 0 : value } : item
    ));
  };

  // Remove sale item
  const removeSaleItem = (itemId) => setSaleItems(saleItems.filter(s => s.id !== itemId));

  // Toggle sale item type
  const toggleSaleType = (itemId) => {
    setSaleItems(saleItems.map(item => 
      item.id === itemId ? { ...item, type: item.type === 'tarifa' ? 'extra' : 'tarifa' } : item
    ));
  };

  // Calculate totals
  const calculateTotals = () => {
    // Total de costos
    const totalCostos = costItems.reduce((sum, item) => sum + item.amount, 0);
    
    // Precio de venta con margen
    const marginDecimal = selectedMargin / 100;
    const precioVentaSugerido = totalCostos > 0 ? totalCostos / (1 - marginDecimal) : 0;
    
    // Ventas por tipo
    const ventasTarifa = saleItems
      .filter(s => s.type === 'tarifa')
      .reduce((sum, item) => sum + item.amount, 0);
    const ventasExtra = saleItems
      .filter(s => s.type === 'extra')
      .reduce((sum, item) => sum + item.amount, 0);
    const totalVentas = ventasTarifa + ventasExtra;
    
    // Si no hay items de venta, usar precio sugerido
    const precioVentaFinal = totalVentas > 0 ? totalVentas : precioVentaSugerido;
    
    // Utilidad
    const utilidadTotal = precioVentaFinal - totalCostos;
    const margenReal = precioVentaFinal > 0 ? (utilidadTotal / precioVentaFinal * 100) : 0;
    
    // IVA
    const iva = precioVentaFinal * 0.16;
    const totalConIva = precioVentaFinal + iva;
    
    return {
      totalCostos,
      precioVentaSugerido,
      ventasTarifa,
      ventasExtra,
      totalVentas,
      precioVentaFinal,
      utilidadTotal,
      margenReal,
      margenObjetivo: selectedMargin,
      iva,
      totalConIva
    };
  };

  const handleCreateQuote = async () => {
    if (!clientName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    if (!selectedRoute) {
      toast.error('Selecciona una ruta');
      return;
    }
    if (costItems.length === 0) {
      toast.error('Agrega al menos un costo');
      return;
    }

    const totals = calculateTotals();

    try {
      const response = await api.post('/ops/quotes', {
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        is_new_client: isNewClient,
        route_id: selectedRoute.id,
        route_description: `${selectedRoute.origin} → ${selectedRoute.destination}`,
        cost_items: costItems.map(item => ({
          description: item.name,
          amount: item.amount
        })),
        items: saleItems.map(item => ({
          item_type: item.type,
          description: item.name,
          category: item.type,
          quantity: 1,
          unit_price: item.amount,
          unit_cost: 0
        })),
        subtotal: totals.precioVentaFinal,
        total_cost: totals.totalCostos,
        margin: totals.utilidadTotal,
        margin_percent: totals.margenReal,
        tax_amount: totals.iva,
        total: totals.totalConIva,
        notes: notes
      });

      toast.success(`Cotización ${response.data.quote.quote_number} creada`);
      setQuotes([response.data.quote, ...quotes]);
      resetForm();
      setShowNewQuote(false);
    } catch (error) {
      toast.error('Error al crear cotización');
    }
  };

  const resetForm = () => {
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setIsNewClient(false);
    setSelectedRoute(null);
    setCostItems([]);
    setSaleItems([]);
    setSelectedMargin(25);
    setNotes('');
  };

  const handleExportPDF = (quote) => {
    setSelectedQuote(quote);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Filter routes
  const filteredRoutes = routes.filter(route => {
    const searchLower = routeSearchQuery.toLowerCase();
    return route.origin.toLowerCase().includes(searchLower) ||
           route.destination.toLowerCase().includes(searchLower) ||
           route.transport_mode.toLowerCase().includes(searchLower);
  });

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="ops-quotes">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cotizaciones</h1>
          <p className="text-slate-500">Crea cotizaciones con análisis de utilidad</p>
        </div>
        <Button onClick={() => setShowNewQuote(true)} className="bg-blue-600 hover:bg-blue-700" data-testid="new-quote-btn">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cotización
        </Button>
      </div>

      {/* Quotes List */}
      {!showNewQuote && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-0">
            {quotes.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No hay cotizaciones aún</p>
                <Button onClick={() => setShowNewQuote(true)} className="mt-4" variant="outline">
                  Crear Primera Cotización
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Cotización</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Cliente</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Ruta</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Estado</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Costo</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Venta</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Utilidad</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Margen</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote) => {
                      const status = STATUS_LABELS[quote.status] || STATUS_LABELS.draft;
                      const margin = quote.margin_percent || 0;
                      return (
                        <tr key={quote.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <span className="font-mono font-medium text-blue-600">{quote.quote_number}</span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-slate-800">{quote.client_name}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-sm text-slate-600">{quote.route_description || '-'}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-red-600">
                            {formatCurrency(quote.total_cost || 0)}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-medium text-slate-800">
                            {formatCurrency(quote.subtotal || 0)}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-medium text-emerald-600">
                            {formatCurrency(quote.margin || 0)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              margin >= 25 ? 'bg-emerald-100 text-emerald-700' :
                              margin >= 20 ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {margin.toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleExportPDF(quote)}>
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Quote Form */}
      {showNewQuote && (
        <div className="space-y-6">
          {/* Client Info */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-slate-800">Nueva Cotización</CardTitle>
                <Button variant="ghost" onClick={() => { setShowNewQuote(false); resetForm(); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Cliente *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Nombre del cliente"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="pl-10"
                      data-testid="client-name-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="email@empresa.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="+52 (xxx) xxx-xxxx"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isNewClient"
                  checked={isNewClient}
                  onChange={(e) => setIsNewClient(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <label htmlFor="isNewClient" className="text-sm text-slate-600">Cliente nuevo</label>
              </div>
            </CardContent>
          </Card>

          {/* Route Selection */}
          <Card className={`bg-white shadow-sm ${selectedRoute ? 'border-emerald-300 border-2' : 'border-red-300 border-2'}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Ship className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-slate-800">Ruta *</CardTitle>
                  {!selectedRoute && (
                    <span className="flex items-center gap-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" /> Requerido
                    </span>
                  )}
                </div>
                <Button onClick={() => setShowRouteSelector(true)} variant="outline" data-testid="select-route-btn">
                  <MapPin className="w-4 h-4 mr-1" />
                  {selectedRoute ? 'Cambiar Ruta' : 'Seleccionar Ruta'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedRoute ? (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-lg font-bold text-slate-800">
                    {selectedRoute.origin} → {selectedRoute.destination}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedRoute.transport_mode} • {selectedRoute.container_size} • {selectedRoute.transit_days} días
                  </p>
                </div>
              ) : (
                <div className="p-8 bg-slate-50 rounded-lg text-center border-2 border-dashed border-slate-300">
                  <Ship className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Selecciona una ruta</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* COSTS Section */}
          {selectedRoute && (
            <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <CardTitle className="text-red-700">Costos de la Operación</CardTitle>
                  </div>
                  <Button size="sm" onClick={() => setShowCostSelector(true)} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" data-testid="add-cost-btn">
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Costo
                  </Button>
                </div>
                <p className="text-sm text-slate-500 mt-1">Define los costos de esta operación según la ruta</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {costItems.map((item) => (
                    <div key={item.id} className={`p-3 rounded-lg border flex justify-between items-center ${
                      item.required ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700 font-medium">{item.name}</span>
                        {item.required && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Base</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-36">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) => updateCostItem(item.id, e.target.value)}
                            className="text-right h-9"
                            placeholder="0.00"
                          />
                        </div>
                        <span className="font-bold text-red-600 w-32 text-right">{formatCurrency(item.amount)}</span>
                        {!item.required && (
                          <button onClick={() => removeCostItem(item.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {item.required && <div className="w-4" />}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Cost Total */}
                <div className="mt-4 p-4 bg-red-100 rounded-lg border border-red-200">
                  <div className="flex justify-between items-center">
                    <span className="text-red-800 font-bold text-lg">Total Costos:</span>
                    <span className="text-red-700 font-bold text-2xl">{formatCurrency(totals.totalCostos)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Margin Selector */}
          {selectedRoute && totals.totalCostos > 0 && (
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-slate-800">Margen de Utilidad Objetivo</CardTitle>
                </div>
                <p className="text-sm text-slate-500">Precio de venta sugerido: <span className="font-bold text-slate-700">{formatCurrency(totals.precioVentaSugerido)}</span></p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {MARGIN_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedMargin(option.value)}
                      className={`flex-1 py-4 px-6 rounded-xl font-bold text-xl transition-all ${
                        selectedMargin === option.value
                          ? `${option.color} text-white shadow-lg scale-105`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      data-testid={`margin-${option.value}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SALES Section */}
          {selectedRoute && totals.totalCostos > 0 && (
            <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-emerald-700">Servicios de Venta (Tarifa al Cliente)</CardTitle>
                  </div>
                  <Button size="sm" onClick={() => setShowSaleSelector(true)} className="bg-emerald-600 hover:bg-emerald-700" data-testid="add-sale-btn">
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Servicio
                  </Button>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Agrega los servicios a cobrar. <span className="text-blue-600 font-medium">Tarifa</span> = incluido en precio base, 
                  <span className="text-amber-600 font-medium"> Extra</span> = cargo adicional que puede o no generarse
                </p>
              </CardHeader>
              <CardContent>
                {saleItems.length === 0 ? (
                  <div className="p-6 bg-emerald-50 rounded-lg text-center border border-emerald-200">
                    <Package className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                    <p className="text-emerald-600 text-sm">Agrega servicios para desglosar la cotización al cliente</p>
                    <p className="text-emerald-500 text-xs mt-1">Si no agregas servicios, se usará el precio sugerido: {formatCurrency(totals.precioVentaSugerido)}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {saleItems.map((item) => (
                      <div key={item.id} className={`p-3 rounded-lg border flex justify-between items-center ${
                        item.type === 'tarifa' ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 font-medium">{item.name}</span>
                          <button
                            onClick={() => toggleSaleType(item.id)}
                            className={`px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors ${
                              item.type === 'tarifa' 
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                          >
                            {item.type === 'tarifa' ? 'Tarifa' : 'Extra'} ↔
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-36">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => updateSaleItem(item.id, 'amount', e.target.value)}
                              className="text-right h-9"
                              placeholder="0.00"
                            />
                          </div>
                          <span className={`font-bold w-32 text-right ${
                            item.type === 'tarifa' ? 'text-blue-600' : 'text-amber-600'
                          }`}>{formatCurrency(item.amount)}</span>
                          <button onClick={() => removeSaleItem(item.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Sales Subtotals */}
                    <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Servicios Tarifa (incluidos):</span>
                        <span className="font-medium text-blue-600">{formatCurrency(totals.ventasTarifa)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Servicios Extra (adicionales):</span>
                        <span className="font-medium text-amber-600">{formatCurrency(totals.ventasExtra)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t border-emerald-200 mt-2 pt-2">
                        <span className="text-emerald-800">Total Venta:</span>
                        <span className="text-emerald-700">{formatCurrency(totals.totalVentas)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {selectedRoute && totals.totalCostos > 0 && (
            <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Resumen de Cotización
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-slate-300 text-xs mb-1">Total Costos</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(totals.totalCostos)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-slate-300 text-xs mb-1">Precio de Venta</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totals.precioVentaFinal)}</p>
                    {saleItems.length === 0 && (
                      <p className="text-slate-400 text-xs mt-1">Sugerido al {selectedMargin}%</p>
                    )}
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-slate-300 text-xs mb-1">Utilidad</p>
                    <p className={`text-2xl font-bold ${totals.utilidadTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(totals.utilidadTotal)}
                    </p>
                    <p className={`text-xs mt-1 ${
                      totals.margenReal >= selectedMargin ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      Margen real: {totals.margenReal.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-blue-600 rounded-lg p-4">
                    <p className="text-blue-200 text-xs mb-1">Total + IVA (16%)</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totals.totalConIva)}</p>
                    <p className="text-blue-200 text-xs mt-1">IVA: {formatCurrency(totals.iva)}</p>
                  </div>
                </div>
                
                {/* Margin comparison */}
                {saleItems.length > 0 && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    totals.margenReal >= selectedMargin 
                      ? 'bg-emerald-500/20 border border-emerald-500/30' 
                      : 'bg-amber-500/20 border border-amber-500/30'
                  }`}>
                    <p className={`text-sm ${totals.margenReal >= selectedMargin ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {totals.margenReal >= selectedMargin 
                        ? `✓ El margen real (${totals.margenReal.toFixed(1)}%) cumple o supera el objetivo (${selectedMargin}%)`
                        : `⚠ El margen real (${totals.margenReal.toFixed(1)}%) está por debajo del objetivo (${selectedMargin}%)`
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes & Actions */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <label className="text-sm text-slate-600 mb-1 block">Notas</label>
              <textarea
                placeholder="Notas adicionales para la cotización..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none h-20"
              />
              <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => { setShowNewQuote(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateQuote} 
                  className="bg-blue-600 hover:bg-blue-700" 
                  data-testid="create-quote-btn"
                  disabled={!selectedRoute || !clientName || totals.totalCostos === 0}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Crear Cotización
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Route Selector Modal */}
      {showRouteSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Seleccionar Ruta</h3>
              <button onClick={() => setShowRouteSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por origen, destino..."
                  value={routeSearchQuery}
                  onChange={(e) => setRouteSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[55vh]">
              <div className="grid gap-2">
                {filteredRoutes.slice(0, 50).map((route) => (
                  <div
                    key={route.id}
                    onClick={() => selectRoute(route)}
                    className="p-4 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-800">{route.origin} → {route.destination}</p>
                        <p className="text-sm text-slate-500">{route.transport_mode} • {route.container_size} • {route.transit_days} días</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Costo Promedio</p>
                        <p className="text-lg font-bold text-blue-600">{formatCurrency(route.avg_cost || route.min_cost || 0)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Selector Modal */}
      {showCostSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-red-50">
              <h3 className="font-semibold text-red-800">Agregar Concepto de Costo</h3>
              <button onClick={() => setShowCostSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div className="grid gap-2">
                {COST_COMPONENTS.filter(c => !c.required).map((concept) => {
                  const isAdded = costItems.some(ci => ci.concept_id === concept.id);
                  return (
                    <div
                      key={concept.id}
                      onClick={() => !isAdded && addCostItem(concept)}
                      className={`p-3 border rounded-lg transition-colors flex justify-between items-center ${
                        isAdded 
                          ? 'bg-slate-100 border-slate-200 cursor-not-allowed' 
                          : 'border-slate-200 hover:bg-red-50 hover:border-red-300 cursor-pointer'
                      }`}
                    >
                      <span className={isAdded ? 'text-slate-400' : 'text-slate-700'}>{concept.name}</span>
                      {isAdded && <span className="text-xs text-slate-400">Ya agregado</span>}
                    </div>
                  );
                })}
              </div>
              
              {/* Custom cost */}
              <div className="pt-4 mt-4 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-2">Costo personalizado</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del costo..."
                    id="customCostInput"
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => {
                      const input = document.getElementById('customCostInput');
                      if (input.value) {
                        addCustomCost(input.value);
                        input.value = '';
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sale Service Selector Modal */}
      {showSaleSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-emerald-50">
              <h3 className="font-semibold text-emerald-800">Agregar Servicio de Venta</h3>
              <button onClick={() => setShowSaleSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {/* Tarifa services */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-1">
                  <Tag className="w-4 h-4" /> Servicios de Tarifa (incluidos en precio base)
                </h4>
                <div className="grid gap-2">
                  {SALE_SERVICES.filter(s => s.defaultType === 'tarifa').map((service) => (
                    <div
                      key={service.id}
                      onClick={() => addSaleItem(service)}
                      className="p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span className="text-slate-700">{service.name}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Tarifa</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Extra services */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Servicios Extra (cargos adicionales)
                </h4>
                <div className="grid gap-2">
                  {SALE_SERVICES.filter(s => s.defaultType === 'extra').map((service) => (
                    <div
                      key={service.id}
                      onClick={() => addSaleItem(service)}
                      className="p-3 border border-slate-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span className="text-slate-700">{service.name}</span>
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Extra</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Custom service */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-2">Servicio personalizado</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del servicio..."
                    value={customSaleName}
                    onChange={(e) => setCustomSaleName(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => customSaleName && addSaleItem(null, true, 'tarifa')}
                    disabled={!customSaleName}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print PDF */}
      {selectedQuote && (
        <div className="hidden print:block" ref={printRef}>
          <div className="p-8 max-w-3xl mx-auto">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">TRANSMODAL</h1>
                <p className="text-slate-500">Soluciones Logísticas Integrales</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">{selectedQuote.quote_number}</p>
                <p className="text-sm text-slate-500">Fecha: {selectedQuote.created_at?.split('T')[0]}</p>
              </div>
            </div>
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold mb-2">Cliente</h3>
              <p className="text-slate-800">{selectedQuote.client_name}</p>
            </div>
            {selectedQuote.route_description && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold mb-1">Ruta</h3>
                <p className="text-slate-800">{selectedQuote.route_description}</p>
              </div>
            )}
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2">Concepto</th>
                  <th className="text-right py-2 w-32">Importe</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuote.items?.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unit_price || item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between py-1">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedQuote.subtotal)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>IVA (16%):</span>
                  <span>{formatCurrency(selectedQuote.tax_amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-slate-800 font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedQuote.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
