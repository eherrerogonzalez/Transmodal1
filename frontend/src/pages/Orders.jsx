import React, { useState, useEffect, useCallback } from 'react';
import { getOrders, createOrder, uploadDocument } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { 
  Plus, 
  FileText, 
  Upload, 
  Search,
  Filter,
  Eye,
  Package,
  MapPin,
  Clock,
  DollarSign,
  X
} from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  'Pendiente': 'bg-amber-50 text-amber-700 border-amber-200',
  'En Proceso': 'bg-blue-50 text-blue-700 border-blue-200',
  'En Tránsito': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'En Aduana': 'bg-purple-50 text-purple-700 border-purple-200',
  'Entregado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Completado': 'bg-slate-50 text-slate-700 border-slate-200',
};

const PORTS = [
  "Shanghai", "Rotterdam", "Los Angeles", "Singapore", 
  "Hamburg", "Manzanillo", "Veracruz", "Lazaro Cardenas"
];

const CONTAINER_TYPES = ["Dry", "Reefer", "Open Top", "Flat Rack"];
const CONTAINER_SIZES = ["20ft", "40ft", "40ft HC", "45ft HC"];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [newOrder, setNewOrder] = useState({
    origin: '',
    destination: '',
    container_type: '',
    container_size: '',
    cargo_description: '',
    weight: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await getOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Error al cargar las órdenes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.origin || !newOrder.destination || !newOrder.container_type || 
        !newOrder.container_size || !newOrder.cargo_description || !newOrder.weight) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    try {
      await createOrder({
        ...newOrder,
        weight: parseFloat(newOrder.weight)
      });
      toast.success('Orden creada exitosamente');
      setShowCreateModal(false);
      setNewOrder({
        origin: '',
        destination: '',
        container_type: '',
        container_size: '',
        cargo_description: '',
        weight: ''
      });
      fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al crear la orden');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedOrder) return;

    setUploadingFile(true);
    try {
      await uploadDocument(selectedOrder.id, file);
      toast.success('Documento subido exitosamente');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Error al subir el documento');
    } finally {
      setUploadingFile(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="orders-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Órdenes</h1>
          <p className="text-slate-500 mt-1">Gestione sus órdenes de contenedores</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button 
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-sm"
              data-testid="create-order-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Orden
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Crear Nueva Orden</DialogTitle>
              <DialogDescription>
                Complete los detalles para crear una nueva orden de contenedor
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Puerto Origen</Label>
                  <Select 
                    value={newOrder.origin} 
                    onValueChange={(v) => setNewOrder({...newOrder, origin: v})}
                  >
                    <SelectTrigger data-testid="order-origin-select">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {PORTS.map(port => (
                        <SelectItem key={port} value={port}>{port}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Puerto Destino</Label>
                  <Select 
                    value={newOrder.destination} 
                    onValueChange={(v) => setNewOrder({...newOrder, destination: v})}
                  >
                    <SelectTrigger data-testid="order-destination-select">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {PORTS.map(port => (
                        <SelectItem key={port} value={port}>{port}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Contenedor</Label>
                  <Select 
                    value={newOrder.container_type} 
                    onValueChange={(v) => setNewOrder({...newOrder, container_type: v})}
                  >
                    <SelectTrigger data-testid="order-type-select">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTAINER_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tamaño</Label>
                  <Select 
                    value={newOrder.container_size} 
                    onValueChange={(v) => setNewOrder({...newOrder, container_size: v})}
                  >
                    <SelectTrigger data-testid="order-size-select">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTAINER_SIZES.map(size => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción de Carga</Label>
                <Input
                  placeholder="Ej: Electrónicos de consumo"
                  value={newOrder.cargo_description}
                  onChange={(e) => setNewOrder({...newOrder, cargo_description: e.target.value})}
                  data-testid="order-cargo-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  placeholder="Ej: 15000"
                  value={newOrder.weight}
                  onChange={(e) => setNewOrder({...newOrder, weight: e.target.value})}
                  data-testid="order-weight-input"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-sm"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateOrder}
                  className="bg-slate-900 hover:bg-slate-800 rounded-sm"
                  data-testid="submit-order-btn"
                >
                  Crear Orden
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por número de orden, origen o destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-sm border-slate-200"
            data-testid="search-orders"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 rounded-sm" data-testid="status-filter">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="En Proceso">En Proceso</SelectItem>
            <SelectItem value="En Tránsito">En Tránsito</SelectItem>
            <SelectItem value="En Aduana">En Aduana</SelectItem>
            <SelectItem value="Entregado">Entregado</SelectItem>
            <SelectItem value="Completado">Completado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <Card className="border-slate-200 rounded-sm">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No se encontraron órdenes</p>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order, index) => (
            <Card 
              key={order.id} 
              className="border-slate-200 rounded-sm shadow-sm hover:shadow-md transition-shadow animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {order.order_number}
                      </h3>
                      <Badge 
                        variant="outline" 
                        className={`rounded-sm ${statusColors[order.status] || 'bg-slate-50 text-slate-700'}`}
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{order.origin} → {order.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Package className="w-4 h-4 text-slate-400" />
                        <span>{order.container_type} {order.container_size}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{order.cargo_description}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span>{formatCurrency(order.total_cost)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailModal(true);
                      }}
                      data-testid={`view-order-${order.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Detalle
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Order Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Detalle de Orden {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Origen</p>
                  <p className="text-lg font-medium text-slate-900">{selectedOrder.origin}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Destino</p>
                  <p className="text-lg font-medium text-slate-900">{selectedOrder.destination}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Tipo</p>
                  <p className="text-lg font-medium text-slate-900">{selectedOrder.container_type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Tamaño</p>
                  <p className="text-lg font-medium text-slate-900">{selectedOrder.container_size}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Peso</p>
                  <p className="text-lg font-medium text-slate-900">{selectedOrder.weight?.toLocaleString()} kg</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Costo Total</p>
                  <p className="text-lg font-medium text-slate-900">{formatCurrency(selectedOrder.total_cost)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Descripción de Carga</p>
                <p className="text-slate-900">{selectedOrder.cargo_description}</p>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <p className="text-sm text-slate-500 uppercase tracking-wider mb-4">Documentos</p>
                <div className="border-2 border-dashed border-slate-300 rounded-sm p-6 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    id="file-upload"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">
                      {uploadingFile ? 'Subiendo...' : 'Haga clic para subir documentos'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG hasta 10MB</p>
                  </label>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
