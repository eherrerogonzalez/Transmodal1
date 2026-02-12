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
  Calculator
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
  const [quoteItems, setQuoteItems] = useState([]);
  const [notes, setNotes] = useState('');

  // Item selection
  const [showRouteSelector, setShowRouteSelector] = useState(false);
  const [showServiceSelector, setShowServiceSelector] = useState(false);

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

  const addRouteToQuote = (route) => {
    const newItem = {
      id: Date.now().toString(),
      item_type: 'route',
      description: `${route.origin} → ${route.destination} (${route.transport_mode}, ${route.container_size})`,
      quantity: 1,
      unit_price: route.suggested_price,
      unit_cost: route.base_cost,
      route_data: route
    };
    setQuoteItems([...quoteItems, newItem]);
    setShowRouteSelector(false);
    toast.success('Ruta agregada');
  };

  const addServiceToQuote = (service) => {
    const newItem = {
      id: Date.now().toString(),
      item_type: 'service',
      description: service.name,
      quantity: 1,
      unit_price: service.suggested_price,
      unit_cost: service.base_cost,
      service_data: service
    };
    setQuoteItems([...quoteItems, newItem]);
    setShowServiceSelector(false);
    toast.success('Servicio agregado');
  };

  const removeItem = (itemId) => {
    setQuoteItems(quoteItems.filter(i => i.id !== itemId));
  };

  const updateItemQuantity = (itemId, quantity) => {
    setQuoteItems(quoteItems.map(item => 
      item.id === itemId ? { ...item, quantity: parseInt(quantity) || 1 } : item
    ));
  };

  const updateItemPrice = (itemId, price) => {
    setQuoteItems(quoteItems.map(item => 
      item.id === itemId ? { ...item, unit_price: parseFloat(price) || 0 } : item
    ));
  };

  const calculateTotals = () => {
    const subtotal = quoteItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const totalCost = quoteItems.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
    const tax = subtotal * 0.16;
    const total = subtotal + tax;
    const margin = subtotal - totalCost;
    const marginPercent = subtotal > 0 ? (margin / subtotal * 100) : 0;
    return { subtotal, tax, total, totalCost, margin, marginPercent };
  };

  const handleCreateQuote = async () => {
    if (!clientName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    if (quoteItems.length === 0) {
      toast.error('Agrega al menos un elemento');
      return;
    }

    try {
      const response = await api.post('/ops/quotes', {
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        is_new_client: isNewClient,
        items: quoteItems.map(item => ({
          item_type: item.item_type,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.unit_cost
        })),
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
    setQuoteItems([]);
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
          <p className="text-slate-500">Crea y gestiona cotizaciones para clientes</p>
        </div>
        <Button onClick={() => setShowNewQuote(true)} className="bg-blue-600 hover:bg-blue-700">
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
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Total</th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Margen</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Válida Hasta</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote) => {
                      const status = STATUS_LABELS[quote.status] || STATUS_LABELS.draft;
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
                          <td className="py-3 px-4 text-right font-medium text-slate-800">
                            {formatCurrency(quote.total)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              quote.margin_percent >= 20 ? 'bg-emerald-100 text-emerald-700' :
                              quote.margin_percent >= 10 ? 'bg-blue-100 text-blue-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {quote.margin_percent}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">{quote.valid_until}</td>
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
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-slate-800">Nueva Cotización</CardTitle>
                <Button variant="ghost" onClick={() => { setShowNewQuote(false); resetForm(); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-slate-700">Elementos de la cotización</label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setShowRouteSelector(true)}>
                      <Ship className="w-4 h-4 mr-1" />
                      Agregar Ruta
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowServiceSelector(true)}>
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Servicio
                    </Button>
                  </div>
                </div>

                {quoteItems.length === 0 ? (
                  <div className="p-8 bg-slate-50 rounded-lg text-center">
                    <Calculator className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">Agrega rutas o servicios a la cotización</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Descripción</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-slate-500 w-24">Cantidad</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 w-32">Precio Unit.</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-slate-500 w-32">Total</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {quoteItems.map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="py-2 px-3 text-sm text-slate-700">{item.description}</td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItemQuantity(item.id, e.target.value)}
                                className="w-full text-center h-8"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => updateItemPrice(item.id, e.target.value)}
                                className="w-full text-right h-8"
                              />
                            </td>
                            <td className="py-2 px-3 text-right text-sm font-medium text-slate-800">
                              {formatCurrency(item.unit_price * item.quantity)}
                            </td>
                            <td className="py-2 px-3">
                              <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totals */}
              {quoteItems.length > 0 && (
                <div className="flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Subtotal:</span>
                      <span className="text-slate-700">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">IVA (16%):</span>
                      <span className="text-slate-700">{formatCurrency(totals.tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                      <span className="text-slate-800">Total:</span>
                      <span className="text-blue-600">{formatCurrency(totals.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                      <span className="text-slate-500">Margen:</span>
                      <span className={`font-medium ${totals.marginPercent >= 15 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {formatCurrency(totals.margin)} ({totals.marginPercent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-sm text-slate-600 mb-1 block">Notas</label>
                <textarea
                  placeholder="Notas adicionales para la cotización..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none h-20"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={() => { setShowNewQuote(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateQuote} className="bg-blue-600 hover:bg-blue-700">
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
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid gap-2">
                {routes.slice(0, 30).map((route) => (
                  <div
                    key={route.id}
                    onClick={() => addRouteToQuote(route)}
                    className="p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-800">{route.origin} → {route.destination}</p>
                        <p className="text-sm text-slate-500">{route.transport_mode} • {route.container_size} • {route.transit_days} días</p>
                      </div>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(route.suggested_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Selector Modal */}
      {showServiceSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Seleccionar Servicio</h3>
              <button onClick={() => setShowServiceSelector(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid gap-2">
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => addServiceToQuote(service)}
                    className="p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-800">{service.name}</p>
                        <p className="text-sm text-slate-500">{service.description}</p>
                      </div>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(service.suggested_price)}</p>
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
                  <th className="text-center py-2 w-20">Cant.</th>
                  <th className="text-right py-2 w-32">P. Unit.</th>
                  <th className="text-right py-2 w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedQuote.items?.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2">{item.description}</td>
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
                  <span>IVA ({selectedQuote.tax_percent}%):</span>
                  <span>{formatCurrency(selectedQuote.tax_amount)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-slate-800 font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedQuote.total)}</span>
                </div>
              </div>
            </div>

            {selectedQuote.terms_conditions && (
              <div className="mt-8 pt-4 border-t border-slate-200">
                <h4 className="font-semibold mb-2">Términos y Condiciones</h4>
                <p className="text-sm text-slate-600">{selectedQuote.terms_conditions}</p>
              </div>
            )}
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
