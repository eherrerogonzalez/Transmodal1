import React, { useState, useEffect } from 'react';
import { 
  Package,
  Plus,
  X,
  Save,
  Trash2,
  Train,
  Truck,
  Ship,
  Building2,
  Shield,
  Warehouse,
  Search,
  ChevronDown,
  ChevronUp,
  Edit,
  DollarSign,
  MapPin,
  Clock,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import api from '../../lib/api';

const CATEGORY_ICONS = {
  ferrocarril: Train,
  terminal_portuaria: Ship,
  transportista: Truck,
  custodia: Shield,
  terminal_intermodal: Warehouse,
  naviera: Ship,
  agente_aduanal: Building2
};

const CATEGORY_LABELS = {
  ferrocarril: 'Ferrocarril',
  terminal_portuaria: 'Terminal Portuaria',
  transportista: 'Transportista',
  custodia: 'Custodia',
  terminal_intermodal: 'Terminal Intermodal',
  naviera: 'Naviera',
  agente_aduanal: 'Agente Aduanal'
};

const CATEGORY_COLORS = {
  ferrocarril: 'bg-blue-100 text-blue-700 border-blue-200',
  terminal_portuaria: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  transportista: 'bg-green-100 text-green-700 border-green-200',
  custodia: 'bg-purple-100 text-purple-700 border-purple-200',
  terminal_intermodal: 'bg-amber-100 text-amber-700 border-amber-200',
  naviera: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  agente_aduanal: 'bg-rose-100 text-rose-700 border-rose-200'
};

export default function OpsPurchases() {
  const [suppliers, setSuppliers] = useState([]);
  const [categoriesSummary, setCategoriesSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSuppliers, setExpandedSuppliers] = useState({});
  const [showAddTariffForm, setShowAddTariffForm] = useState(null); // supplier_id
  const [newTariff, setNewTariff] = useState({
    service_name: '',
    origin: '',
    destination: '',
    container_size: '',
    cost: '',
    transit_days: '',
    notes: ''
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  };

  useEffect(() => {
    fetchSuppliers();
  }, [selectedCategory]);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = selectedCategory ? `?category=${selectedCategory}` : '';
      const response = await api.get(`/ops/purchases/suppliers${params}`);
      setSuppliers(response.data.suppliers);
      setCategoriesSummary(response.data.categories_summary);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  const toggleSupplierExpand = (supplierId) => {
    setExpandedSuppliers(prev => ({ ...prev, [supplierId]: !prev[supplierId] }));
  };

  const handleAddTariff = async (supplierId) => {
    try {
      await api.post(`/ops/purchases/suppliers/${supplierId}/tariffs`, {
        ...newTariff,
        cost: parseFloat(newTariff.cost),
        transit_days: newTariff.transit_days ? parseInt(newTariff.transit_days) : null
      });
      toast.success('Tarifa agregada');
      setShowAddTariffForm(null);
      setNewTariff({ service_name: '', origin: '', destination: '', container_size: '', cost: '', transit_days: '', notes: '' });
      fetchSuppliers();
    } catch (error) {
      toast.error('Error al agregar tarifa');
    }
  };

  const handleDeleteTariff = async (supplierId, tariffId) => {
    if (!confirm('¿Eliminar esta tarifa?')) return;
    try {
      await api.delete(`/ops/purchases/suppliers/${supplierId}/tariffs/${tariffId}`);
      toast.success('Tarifa eliminada');
      fetchSuppliers();
    } catch (error) {
      toast.error('Error al eliminar tarifa');
    }
  };

  // Filter suppliers by search
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.tariffs?.some(t => 
      t.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Calculate totals
  const totalSuppliers = Object.values(categoriesSummary).reduce((acc, c) => acc + c.count, 0);
  const totalTariffs = Object.values(categoriesSummary).reduce((acc, c) => acc + c.tariffs, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tarifario de Compras</h2>
          <p className="text-slate-500">Catálogo de proveedores y sus tarifas</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">{totalSuppliers} proveedores • {totalTariffs} tarifas</p>
        </div>
      </div>

      {/* Category Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`p-3 rounded-lg border-2 transition-all ${
            !selectedCategory 
              ? 'border-purple-500 bg-purple-50' 
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <Package className="w-5 h-5 mx-auto mb-1 text-purple-600" />
          <p className="text-xs font-medium">Todos</p>
          <p className="text-lg font-bold text-purple-600">{totalSuppliers}</p>
        </button>
        
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
          const Icon = CATEGORY_ICONS[key];
          const summary = categoriesSummary[key] || { count: 0, tariffs: 0 };
          const isSelected = selectedCategory === key;
          
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(isSelected ? null : key)}
              className={`p-3 rounded-lg border-2 transition-all ${
                isSelected 
                  ? `${CATEGORY_COLORS[key]} border-current` 
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? '' : 'text-slate-400'}`} />
              <p className="text-xs font-medium truncate">{label}</p>
              <p className="text-lg font-bold">{summary.count}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar proveedor, ruta o servicio..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Suppliers List */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Cargando proveedores...</div>
      ) : filteredSuppliers.length === 0 ? (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No hay proveedores en esta categoría</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSuppliers.map((supplier) => {
            const Icon = CATEGORY_ICONS[supplier.category] || Package;
            const isExpanded = expandedSuppliers[supplier.id];
            const colorClass = CATEGORY_COLORS[supplier.category] || 'bg-slate-100 text-slate-700';
            
            return (
              <Card key={supplier.id} className="bg-white border-slate-200 overflow-hidden">
                <CardContent className="p-0">
                  {/* Supplier Header */}
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                    onClick={() => toggleSupplierExpand(supplier.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${colorClass}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{supplier.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                            {CATEGORY_LABELS[supplier.category]}
                          </span>
                          {supplier.contact_email && (
                            <span>{supplier.contact_email}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Tarifas</p>
                        <p className="text-xl font-bold text-slate-700">{supplier.tariffs?.length || 0}</p>
                      </div>
                      <button className="p-2 hover:bg-slate-100 rounded-lg">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Tariffs */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50">
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium text-slate-700">Tarifas del Proveedor</h4>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); setShowAddTariffForm(supplier.id); }}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Agregar Tarifa
                          </Button>
                        </div>

                        {/* Add Tariff Form */}
                        {showAddTariffForm === supplier.id && (
                          <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
                            <h5 className="font-medium text-slate-700 mb-3">Nueva Tarifa</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Input
                                placeholder="Nombre del servicio *"
                                value={newTariff.service_name}
                                onChange={(e) => setNewTariff({ ...newTariff, service_name: e.target.value })}
                              />
                              <Input
                                placeholder="Origen"
                                value={newTariff.origin}
                                onChange={(e) => setNewTariff({ ...newTariff, origin: e.target.value })}
                              />
                              <Input
                                placeholder="Destino"
                                value={newTariff.destination}
                                onChange={(e) => setNewTariff({ ...newTariff, destination: e.target.value })}
                              />
                              <Input
                                placeholder="Tamaño contenedor"
                                value={newTariff.container_size}
                                onChange={(e) => setNewTariff({ ...newTariff, container_size: e.target.value })}
                              />
                              <Input
                                type="number"
                                placeholder="Costo MXN *"
                                value={newTariff.cost}
                                onChange={(e) => setNewTariff({ ...newTariff, cost: e.target.value })}
                              />
                              <Input
                                type="number"
                                placeholder="Días tránsito"
                                value={newTariff.transit_days}
                                onChange={(e) => setNewTariff({ ...newTariff, transit_days: e.target.value })}
                              />
                              <Input
                                placeholder="Notas"
                                value={newTariff.notes}
                                onChange={(e) => setNewTariff({ ...newTariff, notes: e.target.value })}
                                className="col-span-2"
                              />
                            </div>
                            <div className="flex justify-end gap-2 mt-3">
                              <Button variant="ghost" size="sm" onClick={() => setShowAddTariffForm(null)}>
                                Cancelar
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleAddTariff(supplier.id)}
                                disabled={!newTariff.service_name || !newTariff.cost}
                              >
                                <Save className="w-4 h-4 mr-1" /> Guardar
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Tariffs Table */}
                        {supplier.tariffs?.length > 0 ? (
                          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-slate-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Servicio</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Ruta</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Contenedor</th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Costo</th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Días</th>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Notas</th>
                                  <th className="px-4 py-2 w-10"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {supplier.tariffs.map((tariff) => (
                                  <tr key={tariff.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                      <span className="font-medium text-slate-700">{tariff.service_name}</span>
                                      <div className="flex gap-1 mt-1">
                                        {tariff.includes_return && (
                                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">+RT</span>
                                        )}
                                        {tariff.is_imo && (
                                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">IMO</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                      {tariff.origin && tariff.destination ? (
                                        <span>{tariff.origin} → {tariff.destination}</span>
                                      ) : tariff.origin ? (
                                        <span>{tariff.origin}</span>
                                      ) : (
                                        <span className="text-slate-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      {tariff.container_size && (
                                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                                          {tariff.container_size}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="font-bold text-blue-600">{formatCurrency(tariff.cost)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-slate-500">
                                      {tariff.transit_days || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate" title={tariff.notes}>
                                      {tariff.notes || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTariff(supplier.id, tariff.id); }}
                                        className="p-1.5 hover:bg-red-100 rounded text-red-500"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-center py-6 text-slate-400">Sin tarifas registradas</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
