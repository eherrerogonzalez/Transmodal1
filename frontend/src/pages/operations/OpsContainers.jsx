import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  RefreshCw, 
  X,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Ship,
  Truck,
  Warehouse,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import api from '../../lib/api';

const COST_ICONS = {
  flete_maritimo: Ship,
  flete_ferroviario: Ship,
  maniobras_portuarias: Package,
  maniobra_patio_vacios: Package,
  transporte_terrestre: Truck,
  almacenaje: Warehouse,
  servicios_aduanales: FileText,
  estadias: Clock,
  demoras: AlertTriangle
};

const STATUS_LABELS = {
  delivered: { label: 'Entregado', color: 'bg-emerald-100 text-emerald-700' },
  in_transit: { label: 'En Tránsito', color: 'bg-blue-100 text-blue-700' },
  at_port: { label: 'En Puerto', color: 'bg-amber-100 text-amber-700' },
  customs: { label: 'En Aduana', color: 'bg-purple-100 text-purple-700' }
};

export default function OpsContainers() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [containerDetail, setContainerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadContainers();
  }, []);

  const loadContainers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/ops/containers');
      setContainers(response.data.containers);
    } catch (error) {
      toast.error('Error al cargar contenedores');
    } finally {
      setLoading(false);
    }
  };

  const loadContainerDetail = async (containerId) => {
    setLoadingDetail(true);
    try {
      const response = await api.get(`/ops/containers/${containerId}/profitability`);
      setContainerDetail(response.data);
    } catch (error) {
      toast.error('Error al cargar detalle');
    } finally {
      setLoadingDetail(false);
    }
  };

  const openModal = (container) => {
    setSelectedContainer(container);
    loadContainerDetail(container.container_id);
  };

  const closeModal = () => {
    setSelectedContainer(null);
    setContainerDetail(null);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(value);
  };

  const filteredContainers = containers.filter(c => 
    c.container_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="ops-containers">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Contenedores</h1>
          <p className="text-slate-500">Análisis de rentabilidad por contenedor</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar contenedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button onClick={loadContainers} variant="outline">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-4 px-4 text-sm font-medium text-slate-600">Contenedor</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-slate-600">Cliente</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-slate-600">Ruta</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-slate-600">Estado</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-slate-600">Ingresos</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-slate-600">Costos</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-slate-600">Utilidad</th>
                  <th className="text-right py-4 px-4 text-sm font-medium text-slate-600">Margen</th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredContainers.map((container) => {
                  const status = STATUS_LABELS[container.status] || { label: container.status, color: 'bg-slate-100 text-slate-700' };
                  return (
                    <tr key={container.container_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-mono font-medium text-slate-800">{container.container_number}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{container.client_name}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{container.origin} → {container.destination}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-700">{formatCurrency(container.total_revenue)}</td>
                      <td className="py-3 px-4 text-sm text-right text-slate-700">{formatCurrency(container.total_costs)}</td>
                      <td className={`py-3 px-4 text-sm text-right font-medium ${container.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(container.profit)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          container.margin_percent >= 15 ? 'bg-emerald-100 text-emerald-700' :
                          container.margin_percent >= 8 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {container.margin_percent}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => openModal(container)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          Ver Detalle
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalle de Rentabilidad */}
      {selectedContainer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Rentabilidad del Contenedor</h2>
                <p className="text-slate-500 font-mono">{selectedContainer.container_number}</p>
              </div>
              <button 
                onClick={closeModal}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {loadingDetail ? (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : containerDetail ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <p className="text-sm text-blue-600 mb-1">Ingresos</p>
                      <p className="text-2xl font-bold text-blue-700">{formatCurrency(containerDetail.total_revenue)}</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl">
                      <p className="text-sm text-red-600 mb-1">Costos</p>
                      <p className="text-2xl font-bold text-red-700">{formatCurrency(containerDetail.total_costs)}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${containerDetail.profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <p className={`text-sm mb-1 ${containerDetail.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Utilidad</p>
                      <p className={`text-2xl font-bold ${containerDetail.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatCurrency(containerDetail.profit)}
                      </p>
                    </div>
                    <div className={`p-4 rounded-xl ${containerDetail.margin_percent >= 10 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                      <p className={`text-sm mb-1 ${containerDetail.margin_percent >= 10 ? 'text-emerald-600' : 'text-amber-600'}`}>Margen</p>
                      <p className={`text-2xl font-bold ${containerDetail.margin_percent >= 10 ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {containerDetail.margin_percent}%
                      </p>
                    </div>
                  </div>

                  {/* Info Row */}
                  <div className="p-4 bg-slate-50 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Cliente</p>
                      <p className="font-medium text-slate-800">{containerDetail.client_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Origen</p>
                      <p className="font-medium text-slate-800">{containerDetail.origin}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Destino</p>
                      <p className="font-medium text-slate-800">{containerDetail.destination}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Estado</p>
                      <p className="font-medium text-slate-800">{STATUS_LABELS[containerDetail.status]?.label || containerDetail.status}</p>
                    </div>
                  </div>

                  {/* Costs Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <TrendingDown className="w-5 h-5 text-red-500" />
                      Desglose de Costos
                    </h3>
                    <div className="space-y-2">
                      {containerDetail.costs_breakdown?.map((cost, i) => {
                        const Icon = COST_ICONS[cost.cost_type] || FileText;
                        return (
                          <div key={i} className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-100">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-lg">
                                <Icon className="w-4 h-4 text-red-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{cost.description}</p>
                                <p className="text-xs text-slate-500">{cost.vendor || 'N/A'} • {cost.date}</p>
                              </div>
                            </div>
                            <p className="font-bold text-red-600">{formatCurrency(cost.amount)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Revenue Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      Desglose de Ingresos
                    </h3>
                    <div className="space-y-2">
                      {containerDetail.revenue_breakdown?.map((rev, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 rounded-lg">
                              <DollarSign className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{rev.description}</p>
                              <p className="text-xs text-slate-500">{rev.client_name} • {rev.date}</p>
                            </div>
                          </div>
                          <p className="font-bold text-emerald-600">{formatCurrency(rev.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button onClick={closeModal} variant="outline">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
