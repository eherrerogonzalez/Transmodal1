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
  AlertCircle,
  MapPin,
  Tag,
  Package,
  CheckCircle2,
  Sparkles
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

// Conceptos de costos extra que comercial puede agregar
const EXTRA_COSTS = [
  { id: 'almacenaje', name: 'Almacenaje' },
  { id: 'demoras', name: 'Demoras' },
  { id: 'inspeccion', name: 'Inspección' },
  { id: 'fumigacion', name: 'Fumigación' },
  { id: 'revalidacion', name: 'Revalidación' },
  { id: 'custodia', name: 'Custodia' },
  { id: 'previo', name: 'Previo' },
];

export default function OpsQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [tariffs, setTariffs] = useState([]);
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
  
  // Tariff selection
  const [selectedTariff, setSelectedTariff] = useState(null);
  const [showTariffSelector, setShowTariffSelector] = useState(false);
  const [tariffSearchQuery, setTariffSearchQuery] = useState('');
  
  // Extra services (optional charges)
  const [extraServices, setExtraServices] = useState([]);
  const [showExtraSelector, setShowExtraSelector] = useState(false);
  const [customExtraName, setCustomExtraName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotesRes, tariffsRes] = await Promise.all([
        api.get('/ops/quotes'),
        api.get('/ops/pricing/tariffs')
      ]);
      setQuotes(quotesRes.data.quotes);
      setTariffs(tariffsRes.data.tariffs);
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

  // Select tariff
  const selectTariff = (tariff) => {
    setSelectedTariff(tariff);
    setShowTariffSelector(false);
    toast.success('Tarifa pre-aprobada seleccionada');
  };

  // Add extra service
  const addExtraService = (service, isCustom = false) => {
    const newItem = {
      id: (isCustom ? 'custom' : service.id) + '_' + Date.now(),
      name: isCustom ? customExtraName : service.name,
      amount: 0
    };
    setExtraServices([...extraServices, newItem]);
    setShowExtraSelector(false);
    setCustomExtraName('');
    toast.success('Servicio extra agregado');
  };

  // Update extra service
  const updateExtraService = (itemId, amount) => {
    setExtraServices(extraServices.map(item => 
      item.id === itemId ? { ...item, amount: parseFloat(amount) || 0 } : item
    ));
  };

  // Remove extra service
  const removeExtraService = (itemId) => setExtraServices(extraServices.filter(s => s.id !== itemId));

  // Calculate totals
  const calculateTotals = () => {
    if (!selectedTariff) return { totalCost: 0, totalSale: 0, totalExtras: 0, utilidad: 0, iva: 0, total: 0 };
    
    const totalCost = selectedTariff.total_cost || 0;
    const totalSaleTarifa = selectedTariff.total_sale || selectedTariff.sale_price || 0;
    const totalExtras = extraServices.reduce((sum, s) => sum + s.amount, 0);
    const totalSale = totalSaleTarifa + totalExtras;
    
    // Para extras, aplicar el mismo margen de la tarifa
    const marginPercent = selectedTariff.margin_percent || 20;
    const costExtras = totalExtras * (1 - marginPercent / 100);
    const totalCostWithExtras = totalCost + costExtras;
    
    const utilidad = totalSale - totalCostWithExtras;
    const margenReal = totalSale > 0 ? (utilidad / totalSale * 100) : 0;
    
    const iva = totalSale * 0.16;
    const total = totalSale + iva;
    
    return { 
      totalCost, 
      totalCostWithExtras,
      totalSaleTarifa, 
      totalExtras, 
      totalSale, 
      utilidad, 
      margenReal,
      iva, 
      total 
    };
  };

  const handleCreateQuote = async () => {
    if (!clientName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    if (!selectedTariff) {
      toast.error('Selecciona una tarifa');
      return;
    }

    const totals = calculateTotals();

    try {
      // Crear items de la cotización basados en la tarifa pre-aprobada
      const items = [
        ...(selectedTariff.sale_services || []).map(svc => ({
          item_type: svc.type,
          description: svc.name,
          category: svc.type,
          quantity: 1,
          unit_price: svc.amount,
          unit_cost: 0
        })),
        ...extraServices.map(extra => ({
          item_type: 'extra',
          description: extra.name,
          category: 'extra',
          quantity: 1,
          unit_price: extra.amount,
          unit_cost: 0
        }))
      ];

      const response = await api.post('/ops/quotes', {
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        is_new_client: isNewClient,
        route_id: selectedTariff.route_id,
        route_description: `${selectedTariff.origin} → ${selectedTariff.destination}`,
        tariff_id: selectedTariff.id,
        items: items,
        subtotal: totals.totalSale,
        total_cost: totals.totalCostWithExtras,
        margin: totals.utilidad,
        margin_percent: totals.margenReal,
        tax_amount: totals.iva,
        total: totals.total,
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
    setSelectedTariff(null);
    setExtraServices([]);
    setNotes('');
  };

  const handleExportPDF = (quote) => {
    setSelectedQuote(quote);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Filter tariffs
  const filteredTariffs = tariffs.filter(tariff => {
    const searchLower = tariffSearchQuery.toLowerCase();
    return tariff.origin.toLowerCase().includes(searchLower) ||
           tariff.destination.toLowerCase().includes(searchLower) ||
           tariff.transport_mode.toLowerCase().includes(searchLower);
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
          <p className="text-slate-500">Genera cotizaciones a partir de tarifas pre-aprobadas</p>
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
                          <td className="py-3 px-4 text-right text-sm font-medium text-slate-800">
                            {formatCurrency(quote.subtotal || 0)}
                          </td>
                          <td className="py-3 px-4 text-right text-sm font-medium text-emerald-600">
                            {formatCurrency(quote.margin || 0)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              margin >= 20 ? 'bg-emerald-100 text-emerald-700' :
                              margin >= 15 ? 'bg-blue-100 text-blue-700' :
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

          {/* Tariff Selection */}
          <Card className={`bg-white shadow-sm ${selectedTariff ? 'border-emerald-400 border-2' : 'border-red-300 border-2'}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-slate-800">Tarifa Pre-aprobada *</CardTitle>
                  {!selectedTariff && (
                    <span className="flex items-center gap-1 text-red-500 text-sm">
                      <AlertCircle className="w-4 h-4" /> Requerido
                    </span>
                  )}
                </div>
                <Button onClick={() => setShowTariffSelector(true)} variant="outline" data-testid="select-tariff-btn">
                  <MapPin className="w-4 h-4 mr-1" />
                  {selectedTariff ? 'Cambiar Tarifa' : 'Seleccionar Tarifa'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedTariff ? (
                <div className="space-y-4">
                  {/* Tariff Header */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <p className="text-lg font-bold text-slate-800">
                            {selectedTariff.origin} → {selectedTariff.destination}
                          </p>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {selectedTariff.transport_mode} • {selectedTariff.container_size} • {selectedTariff.transit_days} días
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Vigencia: {selectedTariff.validity_start} al {selectedTariff.validity_end}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Tarifa de Venta</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(selectedTariff.total_sale || selectedTariff.sale_price)}</p>
                        <p className="text-xs text-slate-400">Margen: {selectedTariff.margin_percent}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Cost Breakdown (readonly) */}
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-medium text-red-700">Costos Considerados (referencia)</p>
                    </div>
                    <div className="space-y-1">
                      {selectedTariff.cost_components?.map((comp, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-600">
                            {comp.is_base && <Tag className="w-3 h-3 inline mr-1" />}
                            {comp.name}
                          </span>
                          <span className="text-red-600 font-medium">{formatCurrency(comp.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold pt-2 border-t border-red-200 mt-2">
                        <span className="text-red-800">Total Costo:</span>
                        <span className="text-red-700">{formatCurrency(selectedTariff.total_cost)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Sale Services Breakdown */}
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <p className="text-sm font-medium text-emerald-700">Desglose para el Cliente</p>
                    </div>
                    <div className="space-y-1">
                      {selectedTariff.sale_services?.map((svc, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-600">
                            <span className={`px-1.5 py-0.5 rounded text-xs mr-2 ${
                              svc.type === 'tarifa' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {svc.type === 'tarifa' ? 'Tarifa' : 'Extra'}
                            </span>
                            {svc.name}
                          </span>
                          <span className="text-emerald-600 font-medium">{formatCurrency(svc.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-bold pt-2 border-t border-emerald-200 mt-2">
                        <span className="text-emerald-800">Total Tarifa:</span>
                        <span className="text-emerald-700">{formatCurrency(selectedTariff.total_sale || selectedTariff.sale_price)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-slate-50 rounded-lg text-center border-2 border-dashed border-slate-300">
                  <Ship className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500">Selecciona una tarifa pre-aprobada del catálogo</p>
                  <p className="text-slate-400 text-sm mt-1">Las tarifas incluyen los costos y precios ya calculados</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extra Services (Optional) */}
          {selectedTariff && (
            <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-amber-500">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-600" />
                    <CardTitle className="text-amber-700">Servicios Extra (Opcionales)</CardTitle>
                  </div>
                  <Button size="sm" onClick={() => setShowExtraSelector(true)} variant="outline" className="border-amber-300 text-amber-600 hover:bg-amber-50" data-testid="add-extra-btn">
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Extra
                  </Button>
                </div>
                <p className="text-sm text-slate-500 mt-1">Cargos adicionales que pueden o no generarse en la operación</p>
              </CardHeader>
              <CardContent>
                {extraServices.length === 0 ? (
                  <div className="p-4 bg-amber-50 rounded-lg text-center border border-amber-200">
                    <p className="text-amber-600 text-sm">Sin servicios extra - la cotización usará solo la tarifa base</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {extraServices.map((service) => (
                      <div key={service.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 font-medium">{service.name}</span>
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">Extra</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-36">
                            <Input
                              type="number"
                              step="0.01"
                              value={service.amount}
                              onChange={(e) => updateExtraService(service.id, e.target.value)}
                              className="text-right h-9"
                              placeholder="0.00"
                            />
                          </div>
                          <span className="font-bold text-amber-600 w-32 text-right">{formatCurrency(service.amount)}</span>
                          <button onClick={() => removeExtraService(service.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="p-3 bg-amber-100 rounded-lg border border-amber-300 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-800 font-medium">Total Extras:</span>
                        <span className="text-amber-700 font-bold text-lg">{formatCurrency(totals.totalExtras)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {selectedTariff && (
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
                    <p className="text-slate-300 text-xs mb-1">Tarifa Base</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totals.totalSaleTarifa)}</p>
                    <p className="text-slate-400 text-xs mt-1">Costo: {formatCurrency(totals.totalCost)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-slate-300 text-xs mb-1">+ Extras</p>
                    <p className="text-2xl font-bold text-amber-400">{formatCurrency(totals.totalExtras)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-slate-300 text-xs mb-1">Utilidad</p>
                    <p className={`text-2xl font-bold ${totals.utilidad >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(totals.utilidad)}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">Margen: {totals.margenReal.toFixed(1)}%</p>
                  </div>
                  <div className="bg-blue-600 rounded-lg p-4">
                    <p className="text-blue-200 text-xs mb-1">Total + IVA (16%)</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totals.total)}</p>
                    <p className="text-blue-200 text-xs mt-1">IVA: {formatCurrency(totals.iva)}</p>
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
              <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => { setShowNewQuote(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateQuote} 
                  className="bg-blue-600 hover:bg-blue-700" 
                  data-testid="create-quote-btn"
                  disabled={!selectedTariff || !clientName}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Crear Cotización
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tariff Selector Modal */}
      {showTariffSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-purple-50 to-blue-50">
              <div>
                <h3 className="font-semibold text-slate-800">Tarifas Pre-aprobadas</h3>
                <p className="text-sm text-slate-500">Selecciona la tarifa para esta cotización</p>
              </div>
              <button onClick={() => setShowTariffSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por origen, destino..."
                  value={tariffSearchQuery}
                  onChange={(e) => setTariffSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid gap-3">
                {filteredTariffs.map((tariff) => (
                  <div
                    key={tariff.id}
                    onClick={() => selectTariff(tariff)}
                    className="p-4 border border-slate-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800 text-lg">{tariff.origin} → {tariff.destination}</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {tariff.transport_mode} • {tariff.container_size} • {tariff.transit_days} días
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">
                            Costo: {formatCurrency(tariff.total_cost)}
                          </span>
                          <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs">
                            Margen: {tariff.margin_percent}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Precio de Venta</p>
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(tariff.total_sale || tariff.sale_price)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredTariffs.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    No se encontraron tarifas
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extra Service Selector Modal */}
      {showExtraSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[60vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-amber-50">
              <h3 className="font-semibold text-amber-800">Agregar Servicio Extra</h3>
              <button onClick={() => setShowExtraSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[40vh]">
              <div className="grid gap-2">
                {EXTRA_COSTS.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => addExtraService(service)}
                    className="p-3 border border-slate-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 cursor-pointer transition-colors flex justify-between items-center"
                  >
                    <span className="text-slate-700">{service.name}</span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Extra</span>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 mt-4 border-t border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-2">Servicio personalizado</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del servicio..."
                    value={customExtraName}
                    onChange={(e) => setCustomExtraName(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => customExtraName && addExtraService(null, true)}
                    disabled={!customExtraName}
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
