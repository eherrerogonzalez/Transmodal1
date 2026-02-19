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
  Sparkles,
  FileSignature,
  Train,
  Truck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import api from '../../lib/api';

const STATUS_LABELS = {
  draft: { label: 'Borrador', color: 'bg-slate-100 text-slate-600' },
  sent: { label: 'Enviado', color: 'bg-blue-100 text-blue-600' },
  active: { label: 'Activo', color: 'bg-emerald-100 text-emerald-600' },
  expired: { label: 'Expirado', color: 'bg-amber-100 text-amber-600' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-600' }
};

const MODE_ICONS = {
  rail: Train,
  maritime: Ship,
  intermodal: Ship,
  truck: Truck
};

const MODE_LABELS = {
  rail: 'Ferroviario',
  maritime: 'Marítimo',
  intermodal: 'Intermodal',
  truck: 'Terrestre'
};

export default function OpsQuotes() {
  const [contracts, setContracts] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewContract, setShowNewContract] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const printRef = useRef();
  
  // Client info
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientRFC, setClientRFC] = useState('');
  const [contractDuration, setContractDuration] = useState('90'); // días
  const [notes, setNotes] = useState('');
  
  // Tariff selection - Now supports multiple
  const [selectedTariffs, setSelectedTariffs] = useState([]);
  const [showTariffSelector, setShowTariffSelector] = useState(false);
  const [tariffSearchQuery, setTariffSearchQuery] = useState('');

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
      setContracts(quotesRes.data.quotes || []);
      setTariffs(tariffsRes.data.tariffs || []);
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
    }).format(value || 0);
  };

  // Toggle tariff selection
  const toggleTariffSelection = (tariff) => {
    const exists = selectedTariffs.find(t => t.id === tariff.id);
    if (exists) {
      setSelectedTariffs(selectedTariffs.filter(t => t.id !== tariff.id));
    } else {
      setSelectedTariffs([...selectedTariffs, tariff]);
    }
  };

  // Check if tariff is selected
  const isTariffSelected = (tariffId) => {
    return selectedTariffs.some(t => t.id === tariffId);
  };

  // Filter tariffs
  const filteredTariffs = tariffs.filter(t => {
    const query = tariffSearchQuery.toLowerCase();
    return t.origin?.toLowerCase().includes(query) ||
           t.destination?.toLowerCase().includes(query) ||
           MODE_LABELS[t.transport_mode]?.toLowerCase().includes(query);
  });

  // Calculate totals for all selected tariffs
  const calculateTotals = () => {
    if (selectedTariffs.length === 0) {
      return { totalCost: 0, totalSale: 0, utilidad: 0, margenPromedio: 0 };
    }
    
    const totalCost = selectedTariffs.reduce((sum, t) => sum + (t.total_cost || 0), 0);
    const totalSale = selectedTariffs.reduce((sum, t) => sum + (t.total_sale || t.sale_price || 0), 0);
    const utilidad = totalSale - totalCost;
    const margenPromedio = totalSale > 0 ? (utilidad / totalSale * 100) : 0;
    
    return { totalCost, totalSale, utilidad, margenPromedio };
  };

  const resetForm = () => {
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientRFC('');
    setContractDuration('90');
    setSelectedTariffs([]);
    setNotes('');
  };

  const handleCreateContract = async () => {
    if (!clientName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    if (selectedTariffs.length === 0) {
      toast.error('Selecciona al menos una tarifa');
      return;
    }

    const totals = calculateTotals();
    const validityEnd = new Date();
    validityEnd.setDate(validityEnd.getDate() + parseInt(contractDuration));

    try {
      // Map tariffs to quote items
      const items = selectedTariffs.flatMap(tariff => 
        (tariff.sale_services || []).map(svc => ({
          item_type: svc.type || 'tarifa',
          description: `${tariff.origin} → ${tariff.destination}: ${svc.name}`,
          category: tariff.transport_mode,
          quantity: 1,
          unit_price: svc.amount,
          unit_cost: 0,
          tariff_id: tariff.id
        }))
      );

      const response = await api.post('/ops/quotes', {
        client_name: clientName,
        client_email: clientEmail || null,
        client_phone: clientPhone || null,
        client_rfc: clientRFC || null,
        items,
        subtotal: totals.totalSale,
        tax: totals.totalSale * 0.16,
        total: totals.totalSale * 1.16,
        notes,
        validity_end: validityEnd.toISOString().split('T')[0],
        status: 'draft',
        contract_type: 'tarifario',
        tariff_ids: selectedTariffs.map(t => t.id)
      });

      toast.success('Contrato creado exitosamente');
      resetForm();
      setShowNewContract(false);
      loadData();
    } catch (error) {
      toast.error('Error al crear contrato');
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6" data-testid="ops-contracts">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileSignature className="w-7 h-7 text-purple-600" />
            Contratos de Cliente
          </h1>
          <p className="text-slate-500">Gestiona los contratos con tarifas pre-aprobadas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
          </Button>
          <Button 
            onClick={() => setShowNewContract(true)} 
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="new-contract-btn"
          >
            <Plus className="w-4 h-4 mr-1" /> Nuevo Contrato
          </Button>
        </div>
      </div>

      {/* New Contract Form */}
      {showNewContract && (
        <Card className="bg-white border-purple-200 border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex justify-between items-center">
              <CardTitle className="text-purple-800 flex items-center gap-2">
                <FileSignature className="w-5 h-5" />
                Crear Contrato de Tarifas
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowNewContract(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Client Info */}
            <div>
              <h3 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> Datos del Cliente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Nombre / Razón Social *</label>
                  <Input 
                    placeholder="Empresa S.A. de C.V."
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">RFC</label>
                  <Input 
                    placeholder="ABC123456XYZ"
                    value={clientRFC}
                    onChange={(e) => setClientRFC(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Email</label>
                  <Input 
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Teléfono</label>
                  <Input 
                    placeholder="55 1234 5678"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Contract Duration */}
            <div>
              <h3 className="font-medium text-slate-700 mb-3">Vigencia del Contrato</h3>
              <div className="flex gap-4">
                {['30', '60', '90', '180', '365'].map(days => (
                  <button
                    key={days}
                    onClick={() => setContractDuration(days)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      contractDuration === days 
                        ? 'border-purple-500 bg-purple-50 text-purple-700 font-medium' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {days} días
                  </button>
                ))}
              </div>
            </div>

            {/* Tariff Selection */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-slate-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  Tarifas Pre-aprobadas del Contrato
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTariffSelector(true)}
                  className="border-purple-200 text-purple-600 hover:bg-purple-50"
                >
                  <Plus className="w-4 h-4 mr-1" /> Agregar Tarifas
                </Button>
              </div>

              {/* Selected Tariffs */}
              {selectedTariffs.length > 0 ? (
                <div className="space-y-2">
                  {selectedTariffs.map((tariff) => {
                    const ModeIcon = MODE_ICONS[tariff.transport_mode] || Ship;
                    return (
                      <div 
                        key={tariff.id}
                        className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex justify-between items-center"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <ModeIcon className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {tariff.origin} → {tariff.destination}
                            </p>
                            <p className="text-sm text-slate-500">
                              {MODE_LABELS[tariff.transport_mode]} • {tariff.container_size} • {tariff.transit_days} días
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Precio Venta</p>
                            <p className="font-bold text-emerald-600">{formatCurrency(tariff.total_sale || tariff.sale_price)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-400">Margen</p>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                              tariff.margin_percent >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {tariff.margin_percent}%
                            </span>
                          </div>
                          <button
                            onClick={() => toggleTariffSelection(tariff)}
                            className="p-2 hover:bg-red-100 rounded-lg text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-lg text-center">
                  <Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500">No hay tarifas seleccionadas</p>
                  <p className="text-sm text-slate-400">Agrega tarifas pre-aprobadas para este contrato</p>
                </div>
              )}
            </div>

            {/* Contract Summary */}
            {selectedTariffs.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Resumen del Contrato
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">Tarifas Incluidas</p>
                    <p className="text-2xl font-bold text-purple-700">{selectedTariffs.length}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">Costo Total</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(totals.totalCost)}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">Precio Venta Total</p>
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(totals.totalSale)}</p>
                  </div>
                  <div className="bg-white/80 rounded-lg p-3 text-center">
                    <p className="text-xs text-slate-500">Utilidad / Margen</p>
                    <p className="text-lg font-bold text-purple-700">
                      {formatCurrency(totals.utilidad)} ({totals.margenPromedio.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Notas / Condiciones Especiales</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Términos adicionales, condiciones de pago, etc..."
                className="w-full p-3 border border-slate-200 rounded-lg min-h-[80px] focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => { setShowNewContract(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateContract} 
                className="bg-purple-600 hover:bg-purple-700"
                disabled={!clientName || selectedTariffs.length === 0}
              >
                <FileSignature className="w-4 h-4 mr-1" />
                Crear Contrato
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tariff Selector Modal */}
      {showTariffSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="flex justify-between items-center">
                <CardTitle className="text-purple-800">Seleccionar Tarifas Pre-aprobadas</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowTariffSelector(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Buscar por origen, destino o modo..."
                  value={tariffSearchQuery}
                  onChange={(e) => setTariffSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Selected count */}
              {selectedTariffs.length > 0 && (
                <div className="mb-4 p-2 bg-purple-100 rounded-lg flex justify-between items-center">
                  <span className="text-sm text-purple-700">
                    <strong>{selectedTariffs.length}</strong> tarifas seleccionadas
                  </span>
                  <Button 
                    size="sm" 
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => setShowTariffSelector(false)}
                  >
                    <Check className="w-4 h-4 mr-1" /> Confirmar
                  </Button>
                </div>
              )}

              {/* Tariffs List */}
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredTariffs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p>No hay tarifas pre-aprobadas disponibles</p>
                    <p className="text-sm">Crea tarifas en el módulo de Pricing primero</p>
                  </div>
                ) : (
                  filteredTariffs.map((tariff) => {
                    const ModeIcon = MODE_ICONS[tariff.transport_mode] || Ship;
                    const isSelected = isTariffSelected(tariff.id);
                    
                    return (
                      <div
                        key={tariff.id}
                        onClick={() => toggleTariffSelection(tariff)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-purple-500 bg-purple-50' 
                            : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-200' : 'bg-slate-100'}`}>
                              {isSelected ? (
                                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                              ) : (
                                <ModeIcon className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">
                                {tariff.origin} → {tariff.destination}
                              </p>
                              <p className="text-sm text-slate-500">
                                {MODE_LABELS[tariff.transport_mode]} • {tariff.container_size} • {tariff.transit_days} días
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xs text-slate-400">Venta</p>
                              <p className="font-bold text-emerald-600">
                                {formatCurrency(tariff.total_sale || tariff.sale_price)}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                              tariff.margin_percent >= 20 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {tariff.margin_percent}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Contracts List */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Contratos Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Cargando contratos...</div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12">
              <FileSignature className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No hay contratos registrados</p>
              <p className="text-sm text-slate-400">Crea un nuevo contrato con tarifas pre-aprobadas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Contrato</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Cliente</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">Tarifas</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-slate-500">Total</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-slate-500">Estado</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-500">Vigencia</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => (
                    <tr 
                      key={contract.id} 
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedContract(contract)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-purple-600">{contract.quote_number}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-700">{contract.client_name}</p>
                        {contract.client_email && (
                          <p className="text-xs text-slate-400">{contract.client_email}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                          {contract.items?.length || contract.tariff_ids?.length || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {formatCurrency(contract.total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          STATUS_LABELS[contract.status]?.color || 'bg-slate-100 text-slate-600'
                        }`}>
                          {STATUS_LABELS[contract.status]?.label || contract.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {contract.validity_end}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
