import React, { useState, useEffect } from 'react';
import { getOrders, createOrderWithContainers, uploadDocument, extractDocument } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
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
  Trash2,
  Box,
  Sparkles,
  Loader2,
  CheckCircle,
  Ship
} from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  'Pendiente': 'bg-amber-50 text-amber-700 border-amber-200',
  'En Proceso': 'bg-blue-50 text-blue-700 border-blue-200',
  'En Tránsito': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'En Aduana': 'bg-purple-50 text-purple-700 border-purple-200',
  'Entregado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Completado': 'bg-slate-50 text-slate-700 border-slate-200',
  'created': 'bg-blue-50 text-blue-700 border-blue-200',
};

const PORTS = [
  "Shanghai", "Rotterdam", "Los Angeles", "Singapore", 
  "Hamburg", "Manzanillo", "Veracruz", "Lazaro Cardenas"
];

const CONTAINER_TYPES = ["dry", "reefer", "open_top", "flat_rack"];
const CONTAINER_SIZES = ["20ft", "40ft", "40ft HC", "45ft HC"];
const INCOTERMS = ["FOB", "CIF", "CFR", "EXW", "DDP", "DAP"];

const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(value);

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createStep, setCreateStep] = useState(1); // 1: Upload/Manual, 2: Form

  // New order state with containers
  const [newOrder, setNewOrder] = useState({
    bl_number: '',
    origin: '',
    destination: '',
    incoterm: 'FOB',
    notes: '',
    containers: [{
      id: 'cont-0',
      container_number: '',
      size: '40ft',
      type: 'dry',
      seal_number: '',
      weight: 0,
      products: [{
        id: 'prod-0-0',
        sku: '',
        product_name: '',
        brand: '',
        quantity: 0
      }]
    }]
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

  const resetForm = () => {
    setNewOrder({
      bl_number: '',
      origin: '',
      destination: '',
      incoterm: 'FOB',
      notes: '',
      containers: [{
        id: 'cont-0',
        container_number: '',
        size: '40ft',
        type: 'dry',
        seal_number: '',
        weight: 0,
        products: [{
          id: 'prod-0-0',
          sku: '',
          product_name: '',
          brand: '',
          quantity: 0
        }]
      }]
    });
    setCreateStep(1);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const response = await extractDocument(file);
      
      if (response.data.success && response.data.extracted_data) {
        const data = response.data.extracted_data;
        
        setNewOrder({
          bl_number: data.bl_number || '',
          origin: data.origin_port || '',
          destination: data.destination_port || '',
          incoterm: data.incoterm || 'FOB',
          notes: data.cargo_description || '',
          containers: (data.containers && data.containers.length > 0) ? data.containers.map((c, idx) => ({
            id: `cont-${idx}`,
            container_number: c.number || '',
            size: c.size || '40ft',
            type: c.type || 'dry',
            seal_number: c.seal || '',
            weight: c.weight || 0,
            products: (c.products && c.products.length > 0) ? c.products.map((p, pIdx) => ({
              id: `prod-${idx}-${pIdx}`,
              sku: p.sku || '',
              product_name: p.description || '',
              brand: '',
              quantity: p.quantity || 0
            })) : [{
              id: `prod-${idx}-0`,
              sku: '',
              product_name: '',
              brand: '',
              quantity: 0
            }]
          })) : [{
            id: 'cont-0',
            container_number: '',
            size: '40ft',
            type: 'dry',
            seal_number: '',
            weight: 0,
            products: [{
              id: 'prod-0-0',
              sku: '',
              product_name: '',
              brand: '',
              quantity: 0
            }]
          }]
        });
        
        toast.success('Documento analizado con IA exitosamente');
        setCreateStep(2);
      } else {
        toast.error('No se pudo extraer información del documento');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      toast.error('Error al procesar el documento');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualEntry = () => {
    setCreateStep(2);
  };

  const addContainer = () => {
    const newId = `cont-${newOrder.containers.length}`;
    setNewOrder({
      ...newOrder,
      containers: [...newOrder.containers, {
        id: newId,
        container_number: '',
        size: '40ft',
        type: 'dry',
        seal_number: '',
        weight: 0,
        products: [{
          id: `prod-${newOrder.containers.length}-0`,
          sku: '',
          product_name: '',
          brand: '',
          quantity: 0
        }]
      }]
    });
  };

  const removeContainer = (containerId) => {
    if (newOrder.containers.length <= 1) {
      toast.error('Debe haber al menos un contenedor');
      return;
    }
    setNewOrder({
      ...newOrder,
      containers: newOrder.containers.filter(c => c.id !== containerId)
    });
  };

  const updateContainer = (containerId, field, value) => {
    setNewOrder({
      ...newOrder,
      containers: newOrder.containers.map(c => 
        c.id === containerId ? { ...c, [field]: value } : c
      )
    });
  };

  const addProduct = (containerId) => {
    setNewOrder({
      ...newOrder,
      containers: newOrder.containers.map(c => {
        if (c.id === containerId) {
          const newProdId = `prod-${c.id}-${c.products.length}`;
          return {
            ...c,
            products: [...c.products, {
              id: newProdId,
              sku: '',
              product_name: '',
              brand: '',
              quantity: 0
            }]
          };
        }
        return c;
      })
    });
  };

  const removeProduct = (containerId, productId) => {
    setNewOrder({
      ...newOrder,
      containers: newOrder.containers.map(c => {
        if (c.id === containerId) {
          if (c.products.length <= 1) {
            toast.error('Debe haber al menos un producto por contenedor');
            return c;
          }
          return {
            ...c,
            products: c.products.filter(p => p.id !== productId)
          };
        }
        return c;
      })
    });
  };

  const updateProduct = (containerId, productId, field, value) => {
    setNewOrder({
      ...newOrder,
      containers: newOrder.containers.map(c => {
        if (c.id === containerId) {
          return {
            ...c,
            products: c.products.map(p => 
              p.id === productId ? { ...p, [field]: value } : p
            )
          };
        }
        return c;
      })
    });
  };

  const handleCreateOrder = async () => {
    // Validation
    if (!newOrder.origin || !newOrder.destination) {
      toast.error('Ingrese puerto de origen y destino');
      return;
    }
    
    // Validate at least one container with number
    const hasValidContainer = newOrder.containers.some(c => c.container_number);
    if (!hasValidContainer) {
      toast.error('Ingrese al menos un número de contenedor');
      return;
    }

    setIsCreating(true);
    try {
      const response = await createOrderWithContainers(newOrder);
      toast.success(response.data.message || 'Orden creada exitosamente');
      setShowCreateModal(false);
      resetForm();
      fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Error al crear la orden');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDocumentUpload = async (event) => {
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
    const matchesSearch = order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.origin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.destination?.toLowerCase().includes(searchTerm.toLowerCase());
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
          <p className="text-slate-500 mt-1">Gestione sus órdenes de importación</p>
        </div>
        <Dialog open={showCreateModal} onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button 
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-sm"
              data-testid="create-order-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Orden
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Ship className="w-5 h-5 text-blue-600" />
                {createStep === 1 ? 'Nueva Orden de Importación' : 'Datos de la Orden'}
              </DialogTitle>
              <DialogDescription>
                {createStep === 1 
                  ? 'Suba un documento o ingrese los datos manualmente'
                  : 'Complete los datos de la orden y sus contenedores'
                }
              </DialogDescription>
            </DialogHeader>

            {/* Step 1: Upload or Manual */}
            {createStep === 1 && (
              <div className="space-y-6 py-4">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  {isExtracting ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                      <p className="text-slate-600">Analizando documento con IA...</p>
                    </div>
                  ) : (
                    <>
                      <Sparkles className="w-12 h-12 text-purple-500 mx-auto mb-4" />
                      <p className="text-slate-700 font-medium mb-2">
                        Extracción Inteligente con IA
                      </p>
                      <p className="text-slate-500 text-sm mb-4">
                        Suba el BL, Packing List o Factura y la IA extraerá la información automáticamente
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="doc-upload-order"
                      />
                      <label htmlFor="doc-upload-order">
                        <Button asChild className="bg-blue-600 hover:bg-blue-700 rounded-sm cursor-pointer">
                          <span>
                            <Upload className="w-4 h-4 mr-2" />
                            Subir Documento
                          </span>
                        </Button>
                      </label>
                      <p className="text-xs text-slate-400 mt-3">PDF, PNG, JPG</p>
                    </>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">o</span>
                  </div>
                </div>

                <div className="text-center">
                  <Button variant="outline" onClick={handleManualEntry} className="rounded-sm">
                    <FileText className="w-4 h-4 mr-2" />
                    Ingresar Datos Manualmente
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Order Form with Containers */}
            {createStep === 2 && (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-6 py-4">
                  {/* Order Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800">Información General</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">No. BL</Label>
                        <Input 
                          value={newOrder.bl_number}
                          onChange={(e) => setNewOrder({...newOrder, bl_number: e.target.value})}
                          placeholder="BL-2024-XXXXX"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Puerto Origen *</Label>
                        <Select value={newOrder.origin} onValueChange={(v) => setNewOrder({...newOrder, origin: v})}>
                          <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            {PORTS.map(port => <SelectItem key={port} value={port}>{port}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Puerto Destino *</Label>
                        <Select value={newOrder.destination} onValueChange={(v) => setNewOrder({...newOrder, destination: v})}>
                          <SelectTrigger className="text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            {PORTS.map(port => <SelectItem key={port} value={port}>{port}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Incoterm</Label>
                        <Select value={newOrder.incoterm} onValueChange={(v) => setNewOrder({...newOrder, incoterm: v})}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {INCOTERMS.map(inc => <SelectItem key={inc} value={inc}>{inc}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Notas / Descripción</Label>
                      <Textarea 
                        value={newOrder.notes}
                        onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                        placeholder="Descripción general de la carga..."
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Containers Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800">
                        Contenedores ({newOrder.containers.length})
                      </h3>
                      <Button variant="outline" size="sm" onClick={addContainer} className="rounded-sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Contenedor
                      </Button>
                    </div>

                    {newOrder.containers.map((container, cIdx) => (
                      <Card key={container.id} className="border-slate-200 rounded-sm">
                        <CardHeader className="py-3 px-4 bg-slate-50">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Package className="w-4 h-4 text-blue-600" />
                              Contenedor #{cIdx + 1}
                            </CardTitle>
                            {newOrder.containers.length > 1 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeContainer(container.id)}
                                className="text-red-600 hover:bg-red-50 h-7 w-7 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div>
                              <Label className="text-xs">No. Contenedor *</Label>
                              <Input 
                                value={container.container_number}
                                onChange={(e) => updateContainer(container.id, 'container_number', e.target.value)}
                                placeholder="MSKU1234567"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Tamaño</Label>
                              <Select 
                                value={container.size} 
                                onValueChange={(v) => updateContainer(container.id, 'size', v)}
                              >
                                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {CONTAINER_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Tipo</Label>
                              <Select 
                                value={container.type} 
                                onValueChange={(v) => updateContainer(container.id, 'type', v)}
                              >
                                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="dry">Dry</SelectItem>
                                  <SelectItem value="reefer">Reefer</SelectItem>
                                  <SelectItem value="open_top">Open Top</SelectItem>
                                  <SelectItem value="flat_rack">Flat Rack</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">No. Sello</Label>
                              <Input 
                                value={container.seal_number}
                                onChange={(e) => updateContainer(container.id, 'seal_number', e.target.value)}
                                placeholder="SEAL123"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Peso (kg)</Label>
                              <Input 
                                type="number"
                                value={container.weight}
                                onChange={(e) => updateContainer(container.id, 'weight', parseFloat(e.target.value) || 0)}
                                className="text-sm"
                              />
                            </div>
                          </div>

                          {/* Products */}
                          <div className="bg-slate-50 p-3 rounded-sm">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-xs font-medium flex items-center gap-2 text-slate-600">
                                <Box className="w-3 h-3" />
                                Productos ({container.products.length})
                              </h4>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => addProduct(container.id)}
                                className="text-xs h-6 px-2"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Producto
                              </Button>
                            </div>

                            <div className="space-y-2">
                              {container.products.map((product, pIdx) => (
                                <div key={product.id} className="flex items-center gap-2 bg-white p-2 rounded-sm border border-slate-200">
                                  <div className="flex-1 grid grid-cols-4 gap-2">
                                    <Input 
                                      placeholder="SKU"
                                      value={product.sku}
                                      onChange={(e) => updateProduct(container.id, product.id, 'sku', e.target.value)}
                                      className="text-xs h-8"
                                    />
                                    <Input 
                                      placeholder="Nombre del producto"
                                      value={product.product_name}
                                      onChange={(e) => updateProduct(container.id, product.id, 'product_name', e.target.value)}
                                      className="text-xs h-8 col-span-2"
                                    />
                                    <Input 
                                      type="number"
                                      placeholder="Cantidad"
                                      value={product.quantity || ''}
                                      onChange={(e) => updateProduct(container.id, product.id, 'quantity', parseInt(e.target.value) || 0)}
                                      className="text-xs h-8"
                                    />
                                  </div>
                                  {container.products.length > 1 && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => removeProduct(container.id, product.id)}
                                      className="text-red-500 h-8 w-8 p-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between pt-4 border-t border-slate-200">
                    <Button variant="outline" onClick={() => setCreateStep(1)} className="rounded-sm">
                      Volver
                    </Button>
                    <Button 
                      onClick={handleCreateOrder} 
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-sm"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Crear Orden
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}
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
              className="border-slate-200 rounded-sm shadow-sm hover:shadow-md transition-shadow"
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
                      {order.container_count && (
                        <Badge variant="outline" className="rounded-sm bg-blue-50 text-blue-700">
                          <Package className="w-3 h-3 mr-1" />
                          {order.container_count} contenedor(es)
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{order.origin} → {order.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Package className="w-4 h-4 text-slate-400" />
                        <span>{order.container_type || 'N/A'} {order.container_size || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{order.cargo_description || order.notes || 'Sin descripción'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span>{order.total_cost ? formatCurrency(order.total_cost) : 'Por calcular'}</span>
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
                  <p className="text-lg font-medium text-slate-900">{selectedOrder.container_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Tamaño</p>
                  <p className="text-lg font-medium text-slate-900">{selectedOrder.container_size || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Peso</p>
                  <p className="text-lg font-medium text-slate-900">
                    {selectedOrder.weight ? `${formatNumber(selectedOrder.weight)} kg` : selectedOrder.total_weight ? `${formatNumber(selectedOrder.total_weight)} kg` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Costo Total</p>
                  <p className="text-lg font-medium text-slate-900">
                    {selectedOrder.total_cost ? formatCurrency(selectedOrder.total_cost) : 'Por calcular'}
                  </p>
                </div>
              </div>
              
              {selectedOrder.containers && selectedOrder.containers.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Contenedores</p>
                  <div className="space-y-2">
                    {selectedOrder.containers.map((cont, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-sm">
                        <p className="font-medium">{cont.container_number} - {cont.size} {cont.type}</p>
                        {cont.products && cont.products.length > 0 && (
                          <p className="text-sm text-slate-500 mt-1">
                            {cont.products.length} producto(s)
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Descripción</p>
                <p className="text-slate-900">{selectedOrder.cargo_description || selectedOrder.notes || 'Sin descripción'}</p>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <p className="text-sm text-slate-500 uppercase tracking-wider mb-4">Documentos</p>
                <div className="border-2 border-dashed border-slate-300 rounded-sm p-6 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    id="file-upload-detail"
                    onChange={handleDocumentUpload}
                  />
                  <label htmlFor="file-upload-detail" className="cursor-pointer">
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
