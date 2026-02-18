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
  Tag
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

const CONCEPT_CATEGORIES = {
  tarifa: { label: 'Tarifa', color: 'bg-blue-100 text-blue-700', icon: Tag },
  extra: { label: 'Extra', color: 'bg-amber-100 text-amber-700', icon: Plus }
};

// Conceptos predefinidos de INGRESO
const INCOME_CONCEPTS = [
  { id: 'flete_maritimo', name: 'Flete Marítimo', category: 'tarifa', defaultPrice: 0 },
  { id: 'flete_terrestre', name: 'Flete Terrestre', category: 'tarifa', defaultPrice: 0 },
  { id: 'flete_ferroviario', name: 'Flete Ferroviario', category: 'tarifa', defaultPrice: 0 },
  { id: 'despacho_aduanal', name: 'Despacho Aduanal', category: 'tarifa', defaultPrice: 0 },
  { id: 'maniobras', name: 'Maniobras Portuarias', category: 'tarifa', defaultPrice: 0 },
  { id: 'seguro', name: 'Seguro de Carga', category: 'tarifa', defaultPrice: 0 },
  { id: 'almacenaje', name: 'Almacenaje', category: 'extra', defaultPrice: 0 },
  { id: 'demoras', name: 'Demoras', category: 'extra', defaultPrice: 0 },
  { id: 'inspeccion', name: 'Inspección Adicional', category: 'extra', defaultPrice: 0 },
  { id: 'revalidacion', name: 'Revalidación', category: 'extra', defaultPrice: 0 },
  { id: 'fumigacion', name: 'Fumigación', category: 'extra', defaultPrice: 0 },
  { id: 'custodia', name: 'Custodia', category: 'extra', defaultPrice: 0 },
  { id: 'otro_ingreso', name: 'Otro Ingreso', category: 'extra', defaultPrice: 0 },
];

// Conceptos predefinidos de EGRESO/COSTO
const EXPENSE_CONCEPTS = [
  { id: 'costo_flete_maritimo', name: 'Costo Flete Marítimo', category: 'tarifa', defaultCost: 0 },
  { id: 'costo_flete_terrestre', name: 'Costo Flete Terrestre', category: 'tarifa', defaultCost: 0 },
  { id: 'costo_flete_ferroviario', name: 'Costo Flete Ferroviario', category: 'tarifa', defaultCost: 0 },
  { id: 'costo_despacho', name: 'Costo Despacho Aduanal', category: 'tarifa', defaultCost: 0 },
  { id: 'costo_maniobras', name: 'Costo Maniobras', category: 'tarifa', defaultCost: 0 },
  { id: 'costo_seguro', name: 'Costo Seguro', category: 'tarifa', defaultCost: 0 },
  { id: 'costo_almacenaje', name: 'Costo Almacenaje', category: 'extra', defaultCost: 0 },
  { id: 'costo_demoras', name: 'Costo Demoras', category: 'extra', defaultCost: 0 },
  { id: 'costo_inspeccion', name: 'Costo Inspección', category: 'extra', defaultCost: 0 },
  { id: 'costo_revalidacion', name: 'Costo Revalidación', category: 'extra', defaultCost: 0 },
  { id: 'costo_fumigacion', name: 'Costo Fumigación', category: 'extra', defaultCost: 0 },
  { id: 'costo_custodia', name: 'Costo Custodia', category: 'extra', defaultCost: 0 },
  { id: 'otro_costo', name: 'Otro Costo', category: 'extra', defaultCost: 0 },
];

export default function OpsQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [services, setServices] = useState([]);
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
  
  // Route info
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeDescription, setRouteDescription] = useState('');

  // Income items (Ingresos)
  const [incomeItems, setIncomeItems] = useState([]);
  const [showIncomeSelector, setShowIncomeSelector] = useState(false);
  const [customIncomeName, setCustomIncomeName] = useState('');
  
  // Expense items (Egresos/Costos)
  const [expenseItems, setExpenseItems] = useState([]);
  const [showExpenseSelector, setShowExpenseSelector] = useState(false);
  const [customExpenseName, setCustomExpenseName] = useState('');

  // Route selector
  const [showRouteSelector, setShowRouteSelector] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [quotesRes, routesRes, servicesRes] = await Promise.all([
        api.get('/ops/quotes'),
        api.get('/ops/pricing/routes'),
        api.get('/ops/pricing/services')
      ]);
      setQuotes(quotesRes.data.quotes);
      setRoutes(routesRes.data.routes);
      setServices(servicesRes.data.services);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(value);
  };

  // Route selection
  const selectRoute = (route) => {
    setSelectedRoute(route);
    setRouteDescription(`${route.origin} → ${route.destination} (${route.transport_mode}, ${route.container_size})`);
    setShowRouteSelector(false);
    toast.success('Ruta seleccionada');
  };

  // Add income item
  const addIncomeItem = (concept, isCustom = false) => {
    const newItem = {
      id: Date.now().toString(),
      concept_id: isCustom ? 'custom' : concept.id,
      name: isCustom ? customIncomeName : concept.name,
      category: isCustom ? 'extra' : concept.category,
      amount: 0,
      quantity: 1
    };
    setIncomeItems([...incomeItems, newItem]);
    setShowIncomeSelector(false);
    setCustomIncomeName('');
    toast.success('Concepto de ingreso agregado');
  };

  // Add expense item
  const addExpenseItem = (concept, isCustom = false) => {
    const newItem = {
      id: Date.now().toString(),
      concept_id: isCustom ? 'custom' : concept.id,
      name: isCustom ? customExpenseName : concept.name,
      category: isCustom ? 'extra' : concept.category,
      amount: 0,
      quantity: 1
    };
    setExpenseItems([...expenseItems, newItem]);
    setShowExpenseSelector(false);
    setCustomExpenseName('');
    toast.success('Concepto de costo agregado');
  };

  // Update income item
  const updateIncomeItem = (itemId, field, value) => {
    setIncomeItems(incomeItems.map(item => 
      item.id === itemId ? { ...item, [field]: field === 'amount' ? parseFloat(value) || 0 : parseInt(value) || 1 } : item
    ));
  };

  // Update expense item
  const updateExpenseItem = (itemId, field, value) => {
    setExpenseItems(expenseItems.map(item => 
      item.id === itemId ? { ...item, [field]: field === 'amount' ? parseFloat(value) || 0 : parseInt(value) || 1 } : item
    ));
  };

  // Remove items
  const removeIncomeItem = (itemId) => setIncomeItems(incomeItems.filter(i => i.id !== itemId));
  const removeExpenseItem = (itemId) => setExpenseItems(expenseItems.filter(i => i.id !== itemId));

  // Calculate totals
  const calculateTotals = () => {
    // Ingresos
    const ingresosTarifa = incomeItems
      .filter(i => i.category === 'tarifa')
      .reduce((sum, item) => sum + (item.amount * item.quantity), 0);
    const ingresosExtra = incomeItems
      .filter(i => i.category === 'extra')
      .reduce((sum, item) => sum + (item.amount * item.quantity), 0);
    const totalIngresos = ingresosTarifa + ingresosExtra;
    
    // Egresos
    const egresosTarifa = expenseItems
      .filter(i => i.category === 'tarifa')
      .reduce((sum, item) => sum + (item.amount * item.quantity), 0);
    const egresosExtra = expenseItems
      .filter(i => i.category === 'extra')
      .reduce((sum, item) => sum + (item.amount * item.quantity), 0);
    const totalEgresos = egresosTarifa + egresosExtra;
    
    // Utilidad
    const utilidadTarifa = ingresosTarifa - egresosTarifa;
    const utilidadExtra = ingresosExtra - egresosExtra;
    const utilidadTotal = totalIngresos - totalEgresos;
    
    // Margen
    const margenTarifa = ingresosTarifa > 0 ? (utilidadTarifa / ingresosTarifa * 100) : 0;
    const margenExtra = ingresosExtra > 0 ? (utilidadExtra / ingresosExtra * 100) : 0;
    const margenTotal = totalIngresos > 0 ? (utilidadTotal / totalIngresos * 100) : 0;
    
    // IVA
    const iva = totalIngresos * 0.16;
    const totalConIva = totalIngresos + iva;
    
    return {
      ingresosTarifa,
      ingresosExtra,
      totalIngresos,
      egresosTarifa,
      egresosExtra,
      totalEgresos,
      utilidadTarifa,
      utilidadExtra,
      utilidadTotal,
      margenTarifa,
      margenExtra,
      margenTotal,
      iva,
      totalConIva
    };
  };

  const handleCreateQuote = async () => {
    if (!clientName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    if (incomeItems.length === 0) {
      toast.error('Agrega al menos un concepto de ingreso');
      return;
    }

    const totals = calculateTotals();

    try {
      const response = await api.post('/ops/quotes', {
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        is_new_client: isNewClient,
        route_description: routeDescription,
        items: incomeItems.map(item => ({
          item_type: 'income',
          description: item.name,
          category: item.category,
          quantity: item.quantity,
          unit_price: item.amount,
          unit_cost: 0
        })),
        expense_items: expenseItems.map(item => ({
          item_type: 'expense',
          description: item.name,
          category: item.category,
          quantity: item.quantity,
          unit_cost: item.amount
        })),
        subtotal: totals.totalIngresos,
        total_cost: totals.totalEgresos,
        margin: totals.utilidadTotal,
        margin_percent: totals.margenTotal,
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
    setRouteDescription('');
    setIncomeItems([]);
    setExpenseItems([]);
    setNotes('');
  };

  const handleExportPDF = (quote) => {
    setSelectedQuote(quote);
    setTimeout(() => {
      window.print();
    }, 100);
  };

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
          <p className="text-slate-500">Crea y gestiona cotizaciones con análisis de utilidad</p>
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
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Estado</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Ingresos</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Costos</th>
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
                            {quote.is_new_client && (
                              <span className="text-xs text-amber-600">Cliente nuevo</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-600">
                            {formatCurrency(quote.subtotal || quote.total || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-red-500">
                            {formatCurrency(quote.total_cost || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-800">
                            {formatCurrency(quote.margin || (quote.subtotal - (quote.total_cost || 0)))}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              margin >= 20 ? 'bg-emerald-100 text-emerald-700' :
                              margin >= 10 ? 'bg-blue-100 text-blue-700' :
                              margin >= 0 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {margin.toFixed(1)}%
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

              <div className="flex items-center gap-4">
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
              </div>

              {/* Route Selection */}
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Ruta (opcional)</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej: Shanghai → Manzanillo"
                    value={routeDescription}
                    onChange={(e) => setRouteDescription(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={() => setShowRouteSelector(true)}>
                    <Ship className="w-4 h-4 mr-1" />
                    Seleccionar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Income Section */}
          <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <CardTitle className="text-emerald-700">Conceptos de Ingreso (Venta)</CardTitle>
                </div>
                <Button size="sm" onClick={() => setShowIncomeSelector(true)} className="bg-emerald-600 hover:bg-emerald-700" data-testid="add-income-btn">
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Ingreso
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {incomeItems.length === 0 ? (
                <div className="p-6 bg-emerald-50 rounded-lg text-center">
                  <DollarSign className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                  <p className="text-emerald-600 text-sm">Agrega conceptos de ingreso a la cotización</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-emerald-50">
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-600">Concepto</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-600 w-24">Tipo</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-600 w-20">Cant.</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-slate-600 w-32">Precio Unit.</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-slate-600 w-32">Total</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeItems.map((item) => {
                        const cat = CONCEPT_CATEGORIES[item.category];
                        return (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="py-2 px-3 text-sm text-slate-700">{item.name}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${cat.color}`}>
                                {cat.label}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateIncomeItem(item.id, 'quantity', e.target.value)}
                                className="w-full text-center h-8"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => updateIncomeItem(item.id, 'amount', e.target.value)}
                                className="w-full text-right h-8"
                              />
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-medium text-emerald-600">
                              {formatCurrency(item.amount * item.quantity)}
                            </td>
                            <td className="py-2 px-3">
                              <button onClick={() => removeIncomeItem(item.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Income Subtotals */}
              {incomeItems.length > 0 && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Ingresos Tarifa:</span>
                    <span className="font-medium text-emerald-700">{formatCurrency(totals.ingresosTarifa)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Ingresos Extra:</span>
                    <span className="font-medium text-amber-600">{formatCurrency(totals.ingresosExtra)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-emerald-200 mt-2 pt-2">
                    <span className="text-emerald-800">Total Ingresos:</span>
                    <span className="text-emerald-700">{formatCurrency(totals.totalIngresos)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense Section */}
          <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                  <CardTitle className="text-red-700">Conceptos de Egreso (Costo)</CardTitle>
                </div>
                <Button size="sm" onClick={() => setShowExpenseSelector(true)} className="bg-red-600 hover:bg-red-700" data-testid="add-expense-btn">
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Costo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {expenseItems.length === 0 ? (
                <div className="p-6 bg-red-50 rounded-lg text-center">
                  <Minus className="w-8 h-8 text-red-300 mx-auto mb-2" />
                  <p className="text-red-600 text-sm">Agrega conceptos de costo a la cotización</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-red-50">
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-600">Concepto</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-600 w-24">Tipo</th>
                        <th className="text-center py-2 px-3 text-xs font-medium text-slate-600 w-20">Cant.</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-slate-600 w-32">Costo Unit.</th>
                        <th className="text-right py-2 px-3 text-xs font-medium text-slate-600 w-32">Total</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseItems.map((item) => {
                        const cat = CONCEPT_CATEGORIES[item.category];
                        return (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="py-2 px-3 text-sm text-slate-700">{item.name}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${cat.color}`}>
                                {cat.label}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateExpenseItem(item.id, 'quantity', e.target.value)}
                                className="w-full text-center h-8"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => updateExpenseItem(item.id, 'amount', e.target.value)}
                                className="w-full text-right h-8"
                              />
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-medium text-red-600">
                              {formatCurrency(item.amount * item.quantity)}
                            </td>
                            <td className="py-2 px-3">
                              <button onClick={() => removeExpenseItem(item.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Expense Subtotals */}
              {expenseItems.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Costos Tarifa:</span>
                    <span className="font-medium text-red-700">{formatCurrency(totals.egresosTarifa)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Costos Extra:</span>
                    <span className="font-medium text-amber-600">{formatCurrency(totals.egresosExtra)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-red-200 mt-2 pt-2">
                    <span className="text-red-800">Total Costos:</span>
                    <span className="text-red-700">{formatCurrency(totals.totalEgresos)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profitability Summary */}
          {(incomeItems.length > 0 || expenseItems.length > 0) && (
            <Card className="bg-gradient-to-r from-slate-800 to-slate-700 border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Resumen de Utilidad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Utilidad Tarifa */}
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-slate-300 text-xs mb-1">Utilidad Tarifa</p>
                    <p className={`text-2xl font-bold ${totals.utilidadTarifa >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(totals.utilidadTarifa)}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">Margen: {totals.margenTarifa.toFixed(1)}%</p>
                  </div>
                  
                  {/* Utilidad Extra */}
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-slate-300 text-xs mb-1">Utilidad Extras</p>
                    <p className={`text-2xl font-bold ${totals.utilidadExtra >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                      {formatCurrency(totals.utilidadExtra)}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">Margen: {totals.margenExtra.toFixed(1)}%</p>
                  </div>
                  
                  {/* Utilidad Total */}
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-slate-300 text-xs mb-1">Utilidad Total</p>
                    <p className={`text-2xl font-bold ${totals.utilidadTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(totals.utilidadTotal)}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">Margen: {totals.margenTotal.toFixed(1)}%</p>
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
              </CardContent>
            </Card>
          )}

          {/* Notes */}
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
                <Button onClick={handleCreateQuote} className="bg-blue-600 hover:bg-blue-700" data-testid="create-quote-btn">
                  <Check className="w-4 h-4 mr-2" />
                  Crear Cotización
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Income Selector Modal */}
      {showIncomeSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-emerald-50">
              <h3 className="font-semibold text-emerald-800">Agregar Concepto de Ingreso</h3>
              <button onClick={() => setShowIncomeSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {/* Tarifa concepts */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Conceptos de Tarifa
                </h4>
                <div className="grid gap-2">
                  {INCOME_CONCEPTS.filter(c => c.category === 'tarifa').map((concept) => (
                    <div
                      key={concept.id}
                      onClick={() => addIncomeItem(concept)}
                      className="p-3 border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span className="text-slate-700">{concept.name}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Tarifa</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Extra concepts */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Conceptos Extra
                </h4>
                <div className="grid gap-2">
                  {INCOME_CONCEPTS.filter(c => c.category === 'extra').map((concept) => (
                    <div
                      key={concept.id}
                      onClick={() => addIncomeItem(concept)}
                      className="p-3 border border-slate-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span className="text-slate-700">{concept.name}</span>
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Extra</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Custom concept */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-500 mb-2">Concepto personalizado</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del concepto..."
                    value={customIncomeName}
                    onChange={(e) => setCustomIncomeName(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => customIncomeName && addIncomeItem(null, true)}
                    disabled={!customIncomeName}
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

      {/* Expense Selector Modal */}
      {showExpenseSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-red-50">
              <h3 className="font-semibold text-red-800">Agregar Concepto de Costo</h3>
              <button onClick={() => setShowExpenseSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {/* Tarifa concepts */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Costos de Tarifa
                </h4>
                <div className="grid gap-2">
                  {EXPENSE_CONCEPTS.filter(c => c.category === 'tarifa').map((concept) => (
                    <div
                      key={concept.id}
                      onClick={() => addExpenseItem(concept)}
                      className="p-3 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-300 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span className="text-slate-700">{concept.name}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Tarifa</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Extra concepts */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Costos Extra
                </h4>
                <div className="grid gap-2">
                  {EXPENSE_CONCEPTS.filter(c => c.category === 'extra').map((concept) => (
                    <div
                      key={concept.id}
                      onClick={() => addExpenseItem(concept)}
                      className="p-3 border border-slate-200 rounded-lg hover:bg-amber-50 hover:border-amber-300 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <span className="text-slate-700">{concept.name}</span>
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">Extra</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Custom concept */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-medium text-slate-500 mb-2">Concepto personalizado</h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre del costo..."
                    value={customExpenseName}
                    onChange={(e) => setCustomExpenseName(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => customExpenseName && addExpenseItem(null, true)}
                    disabled={!customExpenseName}
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
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid gap-2">
                {routes.slice(0, 30).map((route) => (
                  <div
                    key={route.id}
                    onClick={() => selectRoute(route)}
                    className="p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-800">{route.origin} → {route.destination}</p>
                        <p className="text-sm text-slate-500">{route.transport_mode} • {route.container_size} • {route.transit_days} días</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-blue-600">{formatCurrency(route.suggested_price)}</p>
                        <p className="text-xs text-slate-400">Costo: {formatCurrency(route.base_cost)}</p>
                      </div>
                    </div>
                  </div>
                ))}
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

            <div className="mb-8 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold mb-2">Cliente</h3>
              <p className="text-slate-800">{selectedQuote.client_name}</p>
              {selectedQuote.client_email && <p className="text-slate-600 text-sm">{selectedQuote.client_email}</p>}
              {selectedQuote.client_phone && <p className="text-slate-600 text-sm">{selectedQuote.client_phone}</p>}
            </div>

            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2">Descripción</th>
                  <th className="text-center py-2 w-20">Tipo</th>
                  <th className="text-center py-2 w-20">Cant.</th>
                  <th className="text-right py-2 w-32">P. Unit.</th>
                  <th className="text-right py-2 w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuote.items?.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-center text-xs">{item.category === 'tarifa' ? 'Tarifa' : 'Extra'}</td>
                    <td className="py-2 text-center">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2 text-right">{formatCurrency(item.total_price)}</td>
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
