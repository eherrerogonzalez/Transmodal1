import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2,
  Download,
  Send,
  Check,
  X,
  Ship,
  ChevronDown,
  User,
  Mail,
  Phone,
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Minus,
  Tag,
  Percent,
  AlertCircle,
  MapPin
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

// Conceptos predefinidos de COSTOS EXTRA
const EXTRA_COST_CONCEPTS = [
  { id: 'almacenaje', name: 'Almacenaje', defaultCost: 0 },
  { id: 'demoras', name: 'Demoras', defaultCost: 0 },
  { id: 'inspeccion', name: 'Inspección Adicional', defaultCost: 0 },
  { id: 'revalidacion', name: 'Revalidación', defaultCost: 0 },
  { id: 'fumigacion', name: 'Fumigación', defaultCost: 0 },
  { id: 'custodia', name: 'Custodia', defaultCost: 0 },
  { id: 'maniobras_extra', name: 'Maniobras Adicionales', defaultCost: 0 },
  { id: 'seguro_extra', name: 'Seguro Adicional', defaultCost: 0 },
  { id: 'documentacion', name: 'Gestión Documental', defaultCost: 0 },
  { id: 'transporte_especial', name: 'Transporte Especial', defaultCost: 0 },
  { id: 'otro_costo', name: 'Otro Costo', defaultCost: 0 },
];

export default function OpsQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const printRef = useRef();
  
  // New quote form
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Route (required)
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  
  // Tarifa All-In (from route)
  const [tarifaAllIn, setTarifaAllIn] = useState(0);
  
  // Extra costs
  const [extraCosts, setExtraCosts] = useState([]);
  const [showExtraCostSelector, setShowExtraCostSelector] = useState(false);
  const [customCostName, setCustomCostName] = useState('');
  
  // Margin selector
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
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  // Select route from pricing
  const selectRoute = (route) => {
    setSelectedRoute(route);
    // Use avg_cost as the all-in tariff (from supplier quotes average)
    setTarifaAllIn(route.avg_cost || route.min_cost || 0);
    setShowRouteSelector(false);
    toast.success('Ruta seleccionada');
  };

  // Add extra cost
  const addExtraCost = (concept, isCustom = false) => {
    const newItem = {
      id: Date.now().toString(),
      concept_id: isCustom ? 'custom' : concept.id,
      name: isCustom ? customCostName : concept.name,
      amount: 0
    };
    setExtraCosts([...extraCosts, newItem]);
    setShowExtraCostSelector(false);
    setCustomCostName('');
    toast.success('Costo extra agregado');
  };

  // Update extra cost
  const updateExtraCost = (itemId, amount) => {
    setExtraCosts(extraCosts.map(item => 
      item.id === itemId ? { ...item, amount: parseFloat(amount) || 0 } : item
    ));
  };

  // Remove extra cost
  const removeExtraCost = (itemId) => setExtraCosts(extraCosts.filter(i => i.id !== itemId));

  // Calculate totals
  const calculateTotals = () => {
    // Total de costos
    const costoTarifa = tarifaAllIn;
    const costosExtras = extraCosts.reduce((sum, item) => sum + item.amount, 0);
    const totalCostos = costoTarifa + costosExtras;
    
    // Precio de venta con margen seleccionado
    // Fórmula: Precio = Costo / (1 - margen)
    const marginDecimal = selectedMargin / 100;
    const precioVentaTarifa = costoTarifa > 0 ? costoTarifa / (1 - marginDecimal) : 0;
    const precioVentaExtras = costosExtras > 0 ? costosExtras / (1 - marginDecimal) : 0;
    const precioVentaTotal = totalCostos > 0 ? totalCostos / (1 - marginDecimal) : 0;
    
    // Utilidad
    const utilidadTarifa = precioVentaTarifa - costoTarifa;
    const utilidadExtras = precioVentaExtras - costosExtras;
    const utilidadTotal = precioVentaTotal - totalCostos;
    
    // IVA
    const iva = precioVentaTotal * 0.16;
    const totalConIva = precioVentaTotal + iva;
    
    return {
      costoTarifa,
      costosExtras,
      totalCostos,
      precioVentaTarifa,
      precioVentaExtras,
      precioVentaTotal,
      utilidadTarifa,
      utilidadExtras,
      utilidadTotal,
      margen: selectedMargin,
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

    const totals = calculateTotals();

    try {
      const response = await api.post('/ops/quotes', {
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        is_new_client: isNewClient,
        route_id: selectedRoute.id,
        route_description: `${selectedRoute.origin} → ${selectedRoute.destination}`,
        items: [
          {
            item_type: 'tarifa_all_in',
            description: `Tarifa All-In: ${selectedRoute.origin} → ${selectedRoute.destination}`,
            category: 'tarifa',
            quantity: 1,
            unit_price: totals.precioVentaTarifa,
            unit_cost: totals.costoTarifa
          },
          ...extraCosts.map(cost => ({
            item_type: 'extra_cost',
            description: cost.name,
            category: 'extra',
            quantity: 1,
            unit_price: cost.amount / (1 - selectedMargin / 100),
            unit_cost: cost.amount
          }))
        ],
        subtotal: totals.precioVentaTotal,
        total_cost: totals.totalCostos,
        margin: totals.utilidadTotal,
        margin_percent: selectedMargin,
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
    setTarifaAllIn(0);
    setExtraCosts([]);
    setSelectedMargin(25);
    setNotes('');
  };

  const handleExportPDF = (quote) => {
    setSelectedQuote(quote);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Filter routes by search
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
          {/* Client Info Card */}
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
              {/* Client Info */}
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

          {/* Route Selection (Required) */}
          <Card className={`bg-white shadow-sm ${selectedRoute ? 'border-emerald-300 border-2' : 'border-red-300 border-2'}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Ship className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-slate-800">Ruta *</CardTitle>
                  {!selectedRoute && (
                    <span className="flex items-center gap-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      Requerido
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
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-lg font-bold text-slate-800">
                        {selectedRoute.origin} → {selectedRoute.destination}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {selectedRoute.transport_mode} • {selectedRoute.container_size} • {selectedRoute.transit_days} días
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Costo Promedio (All-In)</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(selectedRoute.avg_cost || selectedRoute.min_cost)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-slate-50 rounded-lg text-center border-2 border-dashed border-slate-300">
                  <Ship className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Selecciona una ruta del área de Pricing</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tarifa All-In + Extra Costs */}
          {selectedRoute && (
            <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <CardTitle className="text-red-700">Costos</CardTitle>
                  </div>
                  <Button size="sm" onClick={() => setShowExtraCostSelector(true)} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" data-testid="add-extra-cost-btn">
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Costo Extra
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Tarifa All-In */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-slate-800">Tarifa All-In</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Tarifa</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-40">
                          <Input
                            type="number"
                            step="0.01"
                            value={tarifaAllIn}
                            onChange={(e) => setTarifaAllIn(parseFloat(e.target.value) || 0)}
                            className="text-right h-9"
                          />
                        </div>
                        <span className="font-bold text-blue-600 w-32 text-right">{formatCurrency(tarifaAllIn)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Extra Costs */}
                  {extraCosts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-1">
                        <Plus className="w-4 h-4" /> Costos Extra
                      </p>
                      {extraCosts.map((cost) => (
                        <div key={cost.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-700">{cost.name}</span>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Extra</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32">
                              <Input
                                type="number"
                                step="0.01"
                                value={cost.amount}
                                onChange={(e) => updateExtraCost(cost.id, e.target.value)}
                                className="text-right h-8"
                              />
                            </div>
                            <span className="font-medium text-amber-600 w-28 text-right">{formatCurrency(cost.amount)}</span>
                            <button onClick={() => removeExtraCost(cost.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cost Summary */}
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Costo Tarifa:</span>
                      <span className="font-medium text-slate-700">{formatCurrency(totals.costoTarifa)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Costos Extra:</span>
                      <span className="font-medium text-amber-600">{formatCurrency(totals.costosExtras)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t border-red-200 mt-2 pt-2">
                      <span className="text-red-800">Total Costos:</span>
                      <span className="text-red-600">{formatCurrency(totals.totalCostos)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Margin Selector */}
          {selectedRoute && (
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Percent className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-slate-800">Margen de Utilidad</CardTitle>
                </div>
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

          {/* Profitability Summary */}
          {selectedRoute && totals.totalCostos > 0 && (
            <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Resumen de Cotización
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Costos */}
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-slate-300 text-xs mb-1">Total Costos</p>
                    <p className="text-2xl font-bold text-red-400">
                      {formatCurrency(totals.totalCostos)}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Tarifa: {formatCurrency(totals.costoTarifa)} + Extras: {formatCurrency(totals.costosExtras)}
                    </p>
                  </div>
                  
                  {/* Precio de Venta */}
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-slate-300 text-xs mb-1">Precio de Venta</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(totals.precioVentaTotal)}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">Con margen del {selectedMargin}%</p>
                  </div>
                  
                  {/* Utilidad */}
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-slate-300 text-xs mb-1">Utilidad</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(totals.utilidadTotal)}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      Tarifa: {formatCurrency(totals.utilidadTarifa)} + Extras: {formatCurrency(totals.utilidadExtras)}
                    </p>
                  </div>
                  
                  {/* Total con IVA */}
                  <div className="bg-blue-600 rounded-lg p-4">
                    <p className="text-blue-200 text-xs mb-1">Total + IVA (16%)</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(totals.totalConIva)}
                    </p>
                    <p className="text-blue-200 text-xs mt-1">IVA: {formatCurrency(totals.iva)}</p>
                  </div>
                </div>

                {/* Breakdown by type */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-2">Desglose Tarifa</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Costo:</span>
                      <span className="text-red-400">{formatCurrency(totals.costoTarifa)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Venta:</span>
                      <span className="text-white">{formatCurrency(totals.precioVentaTarifa)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium border-t border-white/10 mt-1 pt-1">
                      <span className="text-slate-300">Utilidad:</span>
                      <span className="text-emerald-400">{formatCurrency(totals.utilidadTarifa)}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-slate-400 text-xs mb-2">Desglose Extras</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Costo:</span>
                      <span className="text-amber-400">{formatCurrency(totals.costosExtras)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">Venta:</span>
                      <span className="text-white">{formatCurrency(totals.precioVentaExtras)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium border-t border-white/10 mt-1 pt-1">
                      <span className="text-slate-300">Utilidad:</span>
                      <span className="text-emerald-400">{formatCurrency(totals.utilidadExtras)}</span>
                    </div>
                  </div>
                </div>
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
              
              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => { setShowNewQuote(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateQuote} 
                  className="bg-blue-600 hover:bg-blue-700" 
                  data-testid="create-quote-btn"
                  disabled={!selectedRoute || !clientName}
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
              <h3 className="font-semibold text-slate-800">Seleccionar Ruta desde Pricing</h3>
              <button onClick={() => setShowRouteSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por origen, destino o modo de transporte..."
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
                {filteredRoutes.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    No se encontraron rutas
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extra Cost Selector Modal */}
      {showExtraCostSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-red-50">
              <h3 className="font-semibold text-red-800">Agregar Costo Extra</h3>
              <button onClick={() => setShowExtraCostSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[45vh]">
              <div className="grid gap-2">
                {EXTRA_COST_CONCEPTS.map((concept) => (
                  <div
                    key={concept.id}
                    onClick={() => addExtraCost(concept)}
                    className="p-3 border border-slate-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 cursor-pointer transition-colors flex justify-between items-center"
                  >
                    <span className="text-slate-700">{concept.name}</span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Extra</span>
                  </div>
                ))}
              </div>
              
              {/* Custom concept */}
              <div className="pt-4 mt-4 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-2">Costo personalizado</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del costo..."
                    value={customCostName}
                    onChange={(e) => setCustomCostName(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => customCostName && addExtraCost(null, true)}
                    disabled={!customCostName}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print-only PDF view */}
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
                <p className="text-sm text-slate-500">Válida hasta: {selectedQuote.valid_until}</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold mb-2">Cliente</h3>
              <p className="text-slate-800">{selectedQuote.client_name}</p>
              {selectedQuote.client_email && <p className="text-slate-600 text-sm">{selectedQuote.client_email}</p>}
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
                  <th className="text-center py-2 w-20">Tipo</th>
                  <th className="text-right py-2 w-32">Importe</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuote.items?.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-center text-xs">{item.category === 'tarifa' ? 'Tarifa' : 'Extra'}</td>
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
