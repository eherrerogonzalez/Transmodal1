import React, { useState, useEffect } from 'react';
import { 
  getInventory, getContainersByProduct, getRestockPlan, 
  getProductPositions, createProduct, getWarehouseZones,
  getAppointments, createAppointment, getRestockPredictions,
  getRestockTimeline, getEndClientsOverview, getEndClientInventory,
  getSupplyChainPlan, getDistributionOrders, getActionItems
} from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  Package, AlertTriangle, CheckCircle, Clock, Warehouse, Search, Filter, 
  Calendar, Truck, ArrowRight, Wine, Box, Plus, MapPin, Grid3X3,
  DoorOpen, User, FileText, Shield, Car, Ship, Timer, Store, Building2,
  TrendingDown, Route, CalendarClock, Zap, AlertCircle, Send, ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';

const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(value);

const stockStatusConfig = {
  critical: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Crítico' },
  low: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Bajo' },
  optimal: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Óptimo' },
  excess: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Exceso' },
};

const actionConfig = {
  emergency: { color: 'bg-red-600', text: 'text-white', label: '🚨 EMERGENCIA', bgLight: 'bg-red-100 border-red-300' },
  order_now: { color: 'bg-orange-500', text: 'text-white', label: '📦 PEDIR AHORA', bgLight: 'bg-orange-100 border-orange-300' },
  distribute: { color: 'bg-blue-500', text: 'text-white', label: '🚚 DISTRIBUIR', bgLight: 'bg-blue-100 border-blue-300' },
  order_soon: { color: 'bg-amber-400', text: 'text-amber-900', label: '📋 PROGRAMAR', bgLight: 'bg-amber-100 border-amber-300' },
  none: { color: 'bg-emerald-500', text: 'text-white', label: '✅ OK', bgLight: 'bg-emerald-50 border-emerald-200' },
};

const brandColors = {
  'Absolut': 'bg-blue-100 text-blue-700',
  'Wyborowa': 'bg-indigo-100 text-indigo-700',
  'Chivas Regal': 'bg-amber-100 text-amber-700',
  'José Cuervo': 'bg-orange-100 text-orange-700',
  'Bacardí': 'bg-red-100 text-red-700',
  'Havana Club': 'bg-yellow-100 text-yellow-700',
  'Beefeater': 'bg-pink-100 text-pink-700',
  'Jameson': 'bg-emerald-100 text-emerald-700',
  "Ballantine's": 'bg-purple-100 text-purple-700',
};

const zoneColors = {
  'A': 'bg-blue-500', 'B': 'bg-amber-500', 'C': 'bg-orange-500', 
  'D': 'bg-red-500', 'E': 'bg-purple-500'
};

const appointmentStatusConfig = {
  scheduled: { color: 'bg-blue-100 text-blue-700', label: 'Programada' },
  in_progress: { color: 'bg-amber-100 text-amber-700', label: 'En Proceso' },
  completed: { color: 'bg-emerald-100 text-emerald-700', label: 'Completada' },
  cancelled: { color: 'bg-red-100 text-red-700', label: 'Cancelada' },
};

const clientColors = {
  'Walmart': 'bg-blue-600',
  'Costco': 'bg-red-600',
  'HEB': 'bg-red-500',
  'Soriana': 'bg-green-600',
  'La Comer': 'bg-orange-500',
  'Chedraui': 'bg-purple-600',
};

const Inventory = () => {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState(null);
  const [containers, setContainers] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [zones, setZones] = useState(null);
  const [supplyChainPlan, setSupplyChainPlan] = useState(null);
  const [distributionOrders, setDistributionOrders] = useState(null);
  const [actionItems, setActionItems] = useState(null);
  const [endClientsOverview, setEndClientsOverview] = useState(null);
  const [selectedClientInventory, setSelectedClientInventory] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modals
  const [showPositionsModal, setShowPositionsModal] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showClientDetailModal, setShowClientDetailModal] = useState(false);
  const [showSkuDetailModal, setShowSkuDetailModal] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productPositions, setProductPositions] = useState(null);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [clientDetailLoading, setClientDetailLoading] = useState(false);
  const [selectedSkuPlan, setSelectedSkuPlan] = useState(null);
  
  // New product form
  const [newProduct, setNewProduct] = useState({
    sku: '', name: '', brand: '', category: 'Vodka',
    units_per_container: 1500, minimum_stock: 1000, maximum_stock: 5000, zone_preference: 'A'
  });
  
  // Appointment form
  const [newAppointment, setNewAppointment] = useState({
    container_number: '', product_sku: '', scheduled_date: '', scheduled_time: '',
    operator_name: '', operator_license: '', insurance_policy: '', truck_plates: '', notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, contRes, apptRes, zonesRes, scPlanRes, distRes, actionsRes, clientsRes] = await Promise.all([
        getInventory(),
        getContainersByProduct(),
        getAppointments(),
        getWarehouseZones(),
        getSupplyChainPlan(),
        getDistributionOrders(),
        getActionItems(),
        getEndClientsOverview()
      ]);
      setInventory(invRes.data);
      setContainers(contRes.data);
      setAppointments(apptRes.data);
      setZones(zonesRes.data);
      setSupplyChainPlan(scPlanRes.data);
      setDistributionOrders(distRes.data);
      setActionItems(actionsRes.data);
      setEndClientsOverview(clientsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPositions = async (product) => {
    setSelectedProduct(product);
    setShowPositionsModal(true);
    setPositionsLoading(true);
    
    try {
      const response = await getProductPositions(product.sku);
      setProductPositions(response.data);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Error al cargar posiciones');
    } finally {
      setPositionsLoading(false);
    }
  };

  const handleViewClientDetail = async (clientName) => {
    setShowClientDetailModal(true);
    setClientDetailLoading(true);
    
    try {
      const response = await getEndClientInventory(clientName);
      setSelectedClientInventory(response.data);
    } catch (error) {
      console.error('Error fetching client inventory:', error);
      toast.error('Error al cargar inventario del cliente');
    } finally {
      setClientDetailLoading(false);
    }
  };

  const handleViewSkuDetail = (plan) => {
    setSelectedSkuPlan(plan);
    setShowSkuDetailModal(true);
  };

  const handleCreateProduct = async () => {
    if (!newProduct.sku || !newProduct.name || !newProduct.brand) {
      toast.error('Complete todos los campos requeridos');
      return;
    }
    
    try {
      await createProduct(newProduct);
      toast.success('Producto creado exitosamente');
      setShowNewProductModal(false);
      setNewProduct({
        sku: '', name: '', brand: '', category: 'Vodka',
        units_per_container: 1500, minimum_stock: 1000, maximum_stock: 5000, zone_preference: 'A'
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear producto');
    }
  };

  const handleCreateAppointment = async () => {
    const required = ['container_number', 'product_sku', 'scheduled_date', 'scheduled_time', 
                      'operator_name', 'operator_license', 'insurance_policy', 'truck_plates'];
    const missing = required.filter(f => !newAppointment[f]);
    
    if (missing.length) {
      toast.error('Complete todos los campos requeridos');
      return;
    }
    
    try {
      const response = await createAppointment(newAppointment);
      toast.success(`Cita creada - Puerta asignada: ${response.data.door_assignment.assigned_door}`);
      setShowAppointmentModal(false);
      setNewAppointment({
        container_number: '', product_sku: '', scheduled_date: '', scheduled_time: '',
        operator_name: '', operator_license: '', insurance_policy: '', truck_plates: '', notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear cita');
    }
  };

  const filteredInventory = inventory?.inventory?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = brandFilter === 'all' || item.brand === brandFilter;
    const matchesStatus = statusFilter === 'all' || item.stock_status === statusFilter;
    return matchesSearch && matchesBrand && matchesStatus;
  }) || [];

  const brands = [...new Set(inventory?.inventory?.map(i => i.brand) || [])];
  const categories = ['Vodka', 'Whisky', 'Tequila', 'Ron', 'Gin', 'Otros'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="inventory-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cadena de Suministro</h1>
          <p className="text-slate-500 mt-1">Origen → CEDIS → Cliente Final | Garantizar disponibilidad continua</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setShowNewProductModal(true)} className="rounded-sm bg-slate-900" data-testid="new-product-btn">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
          <Button onClick={() => setShowAppointmentModal(true)} variant="outline" className="rounded-sm" data-testid="new-appointment-btn">
            <Calendar className="w-4 h-4 mr-2" />
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* Alert Banner */}
      {actionItems?.summary?.requires_immediate_attention && (
        <Card className="border-red-300 bg-red-50 rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">⚠️ Atención Requerida</p>
                <p className="text-sm text-red-600">
                  {actionItems.summary.orders_to_place_today} pedidos a origen hoy • 
                  {actionItems.summary.end_client_alerts} alertas de clientes finales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className={`rounded-sm ${supplyChainPlan?.summary?.emergency_actions > 0 ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
          <CardContent className="p-4">
            <p className="text-xs text-red-600 uppercase tracking-wider font-medium">🚨 Emergencias</p>
            <p className="text-2xl font-bold text-red-700">{supplyChainPlan?.summary?.emergency_actions || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-orange-600 uppercase tracking-wider font-medium">📦 Pedir a Origen</p>
            <p className="text-2xl font-bold text-orange-700">{supplyChainPlan?.summary?.orders_needed || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 uppercase tracking-wider font-medium">🚚 Distribuir</p>
            <p className="text-2xl font-bold text-blue-700">{distributionOrders?.summary?.critical_orders || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-purple-600 uppercase tracking-wider font-medium">🏪 Clientes</p>
            <p className="text-2xl font-bold text-purple-700">{endClientsOverview?.total_clients || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wider font-medium">⚠️ Loc. Críticas</p>
            <p className="text-2xl font-bold text-amber-700">{supplyChainPlan?.summary?.total_critical_end_locations || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-slate-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium">📊 SKUs</p>
            <p className="text-2xl font-bold text-slate-700">{supplyChainPlan?.summary?.total_skus_analyzed || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="supply-chain" className="space-y-6">
        <TabsList className="bg-slate-100 rounded-sm flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="supply-chain" className="rounded-sm data-[state=active]:bg-white" data-testid="tab-supply-chain">
            <Zap className="w-4 h-4 mr-2" />Plan Integral
          </TabsTrigger>
          <TabsTrigger value="distribution" className="rounded-sm data-[state=active]:bg-white" data-testid="tab-distribution">
            <Send className="w-4 h-4 mr-2" />Distribución
          </TabsTrigger>
          <TabsTrigger value="end-clients" className="rounded-sm data-[state=active]:bg-white" data-testid="tab-end-clients">
            <Store className="w-4 h-4 mr-2" />Clientes Finales
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-sm data-[state=active]:bg-white" data-testid="tab-inventory">
            <Box className="w-4 h-4 mr-2" />CEDIS
          </TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-sm data-[state=active]:bg-white" data-testid="tab-appointments">
            <Calendar className="w-4 h-4 mr-2" />Citas
          </TabsTrigger>
        </TabsList>

        {/* Supply Chain Plan Tab - NEW & IMPROVED */}
        <TabsContent value="supply-chain" className="space-y-6" data-testid="supply-chain-content">
          {/* Flow Diagram */}
          <Card className="border-slate-200 rounded-sm bg-gradient-to-r from-slate-50 to-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-sm shadow-sm">
                  <Ship className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">ORIGEN</span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-sm shadow-sm">
                  <ArrowDown className="w-5 h-5 text-amber-600" />
                  <span className="font-medium">INBOUND</span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-sm shadow-sm border-2 border-blue-300">
                  <Warehouse className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">CEDIS</span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-sm shadow-sm">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium">DISTRIBUCIÓN</span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
                <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-sm shadow-sm border-2 border-emerald-300">
                  <Store className="w-5 h-5 text-emerald-600" />
                  <span className="font-medium">CLIENTE FINAL</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Items Summary */}
          {actionItems && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Orders to Origin */}
              <Card className={`rounded-sm ${actionItems.actions.origin_orders_today?.length > 0 ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Ship className="w-5 h-5 text-orange-600" />
                    Pedir a Origen HOY
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {actionItems.actions.origin_orders_today?.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      {actionItems.actions.origin_orders_today.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="mb-2 p-2 bg-white rounded-sm text-sm">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-xs text-slate-500">{item.origin} • Déficit: {formatNumber(item.deficit)} uds</p>
                        </div>
                      ))}
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-slate-500">No hay pedidos urgentes hoy</p>
                  )}
                </CardContent>
              </Card>

              {/* Urgent Distributions */}
              <Card className={`rounded-sm ${actionItems.actions.distributions_urgent?.length > 0 ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    Distribuir Urgente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {actionItems.actions.distributions_urgent?.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      {actionItems.actions.distributions_urgent.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="mb-2 p-2 bg-white rounded-sm text-sm">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-xs text-slate-500">{item.locations_to_serve} ubicaciones • {formatNumber(item.units_needed)} uds</p>
                        </div>
                      ))}
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-slate-500">No hay distribuciones urgentes</p>
                  )}
                </CardContent>
              </Card>

              {/* End Client Alerts */}
              <Card className={`rounded-sm ${actionItems.actions.end_client_alerts?.length > 0 ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Alertas Cliente Final
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {actionItems.actions.end_client_alerts?.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      {actionItems.actions.end_client_alerts.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="mb-2 p-2 bg-white rounded-sm text-sm">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-xs text-red-600">{item.critical_locations} ubicaciones críticas</p>
                          <p className="text-xs text-slate-500">Desabasto: {item.earliest_stockout}</p>
                        </div>
                      ))}
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-slate-500">Sin alertas de desabasto</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Full Supply Chain Plans */}
          <Card className="border-slate-200 rounded-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Route className="w-5 h-5 text-slate-600" />
                Plan de Cadena de Suministro por Producto
              </CardTitle>
              <p className="text-sm text-slate-500">Planificación integrada para evitar desabasto en cliente final</p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {supplyChainPlan?.plans?.map((plan, idx) => {
                    const actConf = actionConfig[plan.action_required] || actionConfig.none;
                    return (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-sm border-2 cursor-pointer hover:shadow-md transition-shadow ${actConf.bgLight}`}
                        onClick={() => handleViewSkuDetail(plan)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className={brandColors[plan.brand] || 'bg-slate-100'}>{plan.brand}</Badge>
                            <Badge className={`${actConf.color} ${actConf.text} rounded-sm`}>
                              {actConf.label}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-500 font-mono">{plan.sku}</span>
                        </div>
                        
                        <p className="font-semibold text-slate-900 mb-3">{plan.product_name}</p>
                        <p className="text-sm text-slate-600 mb-3">{plan.action_description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="bg-white/60 p-2 rounded-sm">
                            <p className="text-slate-500">Stock CEDIS</p>
                            <p className="font-bold text-lg">{formatNumber(plan.cedis_current_stock)}</p>
                            <p className="text-slate-400">{plan.cedis_days_of_stock}d de stock</p>
                          </div>
                          <div className="bg-white/60 p-2 rounded-sm">
                            <p className="text-slate-500">Demanda Clientes</p>
                            <p className="font-bold text-lg text-blue-600">{formatNumber(plan.total_end_client_demand)}</p>
                            <p className="text-slate-400">{plan.end_clients_needing_restock} ubicaciones</p>
                          </div>
                          <div className="bg-white/60 p-2 rounded-sm">
                            <p className="text-slate-500">Ubicaciones Críticas</p>
                            <p className={`font-bold text-lg ${plan.critical_end_client_locations > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {plan.critical_end_client_locations}
                            </p>
                            <p className="text-slate-400">{plan.can_fulfill_from_cedis ? '✓ Puede surtir' : '✗ Déficit'}</p>
                          </div>
                          <div className="bg-white/60 p-2 rounded-sm">
                            <p className="text-slate-500">Lead Time</p>
                            <p className="font-bold text-lg">{plan.inbound_lead_time_days}d</p>
                            <p className="text-slate-400">{plan.suggested_origin}</p>
                          </div>
                        </div>

                        {(plan.distribution_ship_by_date || plan.cedis_reorder_date) && (
                          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
                            {plan.distribution_ship_by_date && (
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-blue-500" />
                                <span>Enviar de CEDIS: <strong>{plan.distribution_ship_by_date}</strong></span>
                              </div>
                            )}
                            {plan.cedis_reorder_date && (
                              <div className="flex items-center gap-2">
                                <Ship className="w-4 h-4 text-orange-500" />
                                <span>Pedir a origen: <strong>{plan.cedis_reorder_date}</strong></span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Distribution Tab */}
        <TabsContent value="distribution" className="space-y-4" data-testid="distribution-content">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Órdenes de Distribución</h3>
              <p className="text-sm text-slate-500">Entregas pendientes desde CEDIS a clientes finales</p>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-red-100 text-red-700">{distributionOrders?.summary?.critical_orders || 0} críticas</Badge>
              <Badge className="bg-slate-100">{distributionOrders?.summary?.total_orders || 0} total</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Priority */}
            <Card className="border-slate-200 rounded-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Por Prioridad</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {distributionOrders?.orders?.map((order, idx) => (
                    <div key={idx} className={`mb-3 p-3 rounded-sm border ${
                      order.priority === 'critical' ? 'border-red-200 bg-red-50' :
                      order.priority === 'high' ? 'border-amber-200 bg-amber-50' :
                      'border-slate-200 bg-white'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={
                          order.priority === 'critical' ? 'bg-red-600 text-white' :
                          order.priority === 'high' ? 'bg-amber-600 text-white' :
                          'bg-slate-200'
                        }>{order.priority.toUpperCase()}</Badge>
                        <span className="text-xs text-slate-500">{order.ship_by_date}</span>
                      </div>
                      <p className="font-medium text-sm">{order.product_name}</p>
                      <p className="text-xs text-slate-500">{order.client_name} - {order.store_name}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatNumber(order.quantity)} unidades • {order.distribution_time_days}d de tránsito</p>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* By Client */}
            <Card className="border-slate-200 rounded-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Por Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(distributionOrders?.by_client || {}).map(([client, data]) => (
                    <div key={client} className="p-3 bg-slate-50 rounded-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-sm ${clientColors[client] || 'bg-slate-600'} flex items-center justify-center`}>
                            <Building2 className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium">{client}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{data.orders} órdenes</p>
                          <p className="text-xs text-slate-500">{formatNumber(data.units)} unidades</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* End Clients Tab */}
        <TabsContent value="end-clients" className="space-y-6" data-testid="end-clients-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {endClientsOverview?.clients?.map((client, idx) => {
              const clientColor = clientColors[client.client_name] || 'bg-slate-600';
              const isUrgent = client.restock_urgency === 'critical';
              
              return (
                <Card 
                  key={idx} 
                  className={`border-2 rounded-sm cursor-pointer transition-all hover:shadow-md ${
                    isUrgent ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  onClick={() => handleViewClientDetail(client.client_name)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-12 h-12 ${clientColor} rounded-sm flex items-center justify-center`}>
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{client.client_name}</h4>
                        <p className="text-xs text-slate-500">{client.total_stores} tiendas</p>
                      </div>
                      {isUrgent && <Badge className="bg-red-600 text-white ml-auto">CRÍTICO</Badge>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/70 p-2 rounded-sm">
                        <p className="text-xs text-slate-500">Críticos</p>
                        <p className="font-bold text-red-600">{client.critical_stockouts}</p>
                      </div>
                      <div className="bg-white/70 p-2 rounded-sm">
                        <p className="text-xs text-slate-500">Unidades a Enviar</p>
                        <p className="font-bold text-blue-600">{formatNumber(client.total_units_to_ship)}</p>
                      </div>
                    </div>
                    
                    <Button variant="outline" className="w-full mt-4 rounded-sm" size="sm">
                      Ver Detalle <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar producto, SKU o marca..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 rounded-sm" />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-sm">
                <Wine className="w-4 h-4 mr-2 text-slate-400" /><SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {brands.map(brand => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Card className="border-slate-200 rounded-sm shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Producto</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Marca</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-right">Stock</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-center">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-center">Posiciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => {
                    const statusConf = stockStatusConfig[item.stock_status];
                    return (
                      <TableRow key={item.sku} className="hover:bg-slate-50">
                        <TableCell>
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-sm ${brandColors[item.brand] || 'bg-slate-100'}`}>{item.brand}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{formatNumber(item.current_stock)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`rounded-sm ${statusConf.color}`}>{statusConf.label}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="outline" className="rounded-sm" onClick={() => handleViewPositions(item)}>
                            <MapPin className="w-3 h-3 mr-1" />Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Citas de Entrega (Inbounds)</h3>
            <Button onClick={() => setShowAppointmentModal(true)} className="rounded-sm bg-slate-900">
              <Plus className="w-4 h-4 mr-2" />Nueva Cita
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {appointments?.appointments?.map((appt, idx) => {
                const statusConf = appointmentStatusConfig[appt.status];
                return (
                  <Card key={appt.id || idx} className="border-slate-200 rounded-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={brandColors[appt.brand] || 'bg-slate-100'}>{appt.brand}</Badge>
                        <Badge variant="outline" className={`rounded-sm ${statusConf?.color}`}>{statusConf?.label}</Badge>
                        <Badge variant="outline" className="rounded-sm bg-slate-100">
                          <DoorOpen className="w-3 h-3 mr-1" />Puerta {appt.assigned_door}
                        </Badge>
                      </div>
                      <p className="font-semibold text-slate-900">{appt.product_name}</p>
                      <p className="text-sm text-slate-500 font-mono">{appt.container_number}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span>📅 {appt.scheduled_date} {appt.scheduled_time}</span>
                        <span>👤 {appt.operator_name}</span>
                        <span>{formatNumber(appt.quantity)} unidades</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* SKU Detail Modal */}
      <Dialog open={showSkuDetailModal} onOpenChange={setShowSkuDetailModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-blue-600" />
              Plan de Cadena: {selectedSkuPlan?.product_name}
            </DialogTitle>
          </DialogHeader>
          {selectedSkuPlan && (
            <div className="space-y-4">
              <div className={`p-4 rounded-sm ${actionConfig[selectedSkuPlan.action_required]?.bgLight}`}>
                <p className="font-medium">{selectedSkuPlan.action_description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-sm">
                  <h4 className="font-medium mb-2">📦 CEDIS</h4>
                  <p className="text-2xl font-bold">{formatNumber(selectedSkuPlan.cedis_current_stock)}</p>
                  <p className="text-sm text-slate-500">Stock actual ({selectedSkuPlan.cedis_days_of_stock}d)</p>
                  <p className="text-sm text-slate-500">Mínimo: {formatNumber(selectedSkuPlan.cedis_minimum_stock)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-sm">
                  <h4 className="font-medium mb-2">🏪 Clientes Finales</h4>
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(selectedSkuPlan.total_end_client_demand)}</p>
                  <p className="text-sm text-slate-500">Demanda total</p>
                  <p className="text-sm text-red-500">{selectedSkuPlan.critical_end_client_locations} ubicaciones críticas</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-sm">
                <h4 className="font-medium mb-2">🚢 Ruta de Inbound</h4>
                <div className="flex items-center gap-2">
                  <span>{selectedSkuPlan.route_details?.origin}</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>{selectedSkuPlan.route_details?.destination}</span>
                  <Badge className="ml-auto">{selectedSkuPlan.inbound_lead_time_days} días</Badge>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Tránsito: {selectedSkuPlan.route_details?.transit_days}d + Puerto + Aduana + Terrestre
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedSkuPlan.distribution_ship_by_date && (
                  <div className="p-3 bg-emerald-50 rounded-sm">
                    <p className="text-emerald-700 font-medium">🚚 Enviar de CEDIS</p>
                    <p className="text-lg font-bold">{selectedSkuPlan.distribution_ship_by_date}</p>
                  </div>
                )}
                {selectedSkuPlan.cedis_reorder_date && (
                  <div className="p-3 bg-orange-50 rounded-sm">
                    <p className="text-orange-700 font-medium">📦 Pedir a Origen</p>
                    <p className="text-lg font-bold">{selectedSkuPlan.cedis_reorder_date}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Positions Modal */}
      <Dialog open={showPositionsModal} onOpenChange={setShowPositionsModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Posiciones en Almacén
            </DialogTitle>
          </DialogHeader>
          {positionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : productPositions && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-sm">
                <p className="font-semibold">{productPositions.product_name}</p>
                <Badge className="mt-2 bg-emerald-100 text-emerald-700">
                  Puerta Recomendada: {productPositions.recommended_door}
                </Badge>
              </div>
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posición</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-center">Puerta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productPositions.positions?.map((pos, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge className={`${zoneColors[pos.zone]} text-white rounded-sm font-mono`}>
                            {pos.full_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(pos.current_units)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="rounded-sm">Puerta {pos.nearest_door}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Client Detail Modal */}
      <Dialog open={showClientDetailModal} onOpenChange={setShowClientDetailModal}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-purple-600" />
              {selectedClientInventory?.client_name}
            </DialogTitle>
          </DialogHeader>
          {clientDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedClientInventory && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-sm text-center">
                  <p className="text-2xl font-bold">{selectedClientInventory.summary?.total_locations}</p>
                  <p className="text-xs text-slate-500">Tiendas</p>
                </div>
                <div className="p-3 bg-red-50 rounded-sm text-center">
                  <p className="text-2xl font-bold text-red-600">{selectedClientInventory.summary?.critical_stockouts}</p>
                  <p className="text-xs text-red-500">Críticos</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-sm text-center">
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(selectedClientInventory.summary?.total_units_to_ship)}</p>
                  <p className="text-xs text-blue-500">Unidades a Enviar</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-sm text-center">
                  <p className="text-2xl font-bold">{selectedClientInventory.summary?.products_tracked}</p>
                  <p className="text-xs text-slate-500">Productos</p>
                </div>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {selectedClientInventory.stores?.slice(0, 10).map((store, idx) => (
                    <Card key={idx} className={`border rounded-sm ${store.critical_count > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">{store.store_name}</p>
                          {store.critical_count > 0 && (
                            <Badge className="bg-red-600 text-white">{store.critical_count} críticos</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {store.products?.slice(0, 4).map((prod, pIdx) => (
                            <div key={pIdx} className={`p-2 rounded-sm text-xs ${prod.days_of_stock <= 3 ? 'bg-red-100' : 'bg-white'}`}>
                              <p className="font-medium truncate">{prod.product_name}</p>
                              <p className="text-slate-500">{prod.current_stock} uds ({prod.days_of_stock}d)</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Product Modal */}
      <Dialog open={showNewProductModal} onOpenChange={setShowNewProductModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nuevo Producto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>SKU *</Label><Input value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} placeholder="ABC-123" /></div>
              <div><Label>Marca *</Label><Input value={newProduct.brand} onChange={e => setNewProduct({...newProduct, brand: e.target.value})} placeholder="Marca" /></div>
            </div>
            <div><Label>Nombre del Producto *</Label><Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="Nombre completo" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoría</Label>
                <Select value={newProduct.category} onValueChange={v => setNewProduct({...newProduct, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Zona Preferida</Label>
                <Select value={newProduct.zone_preference} onValueChange={v => setNewProduct({...newProduct, zone_preference: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['A','B','C','D','E'].map(z => <SelectItem key={z} value={z}>Zona {z}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowNewProductModal(false)}>Cancelar</Button>
              <Button onClick={handleCreateProduct} className="bg-slate-900">Crear Producto</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Appointment Modal */}
      <Dialog open={showAppointmentModal} onOpenChange={setShowAppointmentModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nueva Cita de Entrega (Inbound)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>No. Contenedor *</Label><Input value={newAppointment.container_number} onChange={e => setNewAppointment({...newAppointment, container_number: e.target.value})} placeholder="MSKU1234567" /></div>
              <div>
                <Label>Producto *</Label>
                <Select value={newAppointment.product_sku} onValueChange={v => setNewAppointment({...newAppointment, product_sku: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{inventory?.inventory?.map(p => <SelectItem key={p.sku} value={p.sku}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Fecha *</Label><Input type="date" value={newAppointment.scheduled_date} onChange={e => setNewAppointment({...newAppointment, scheduled_date: e.target.value})} /></div>
              <div><Label>Hora *</Label><Input type="time" value={newAppointment.scheduled_time} onChange={e => setNewAppointment({...newAppointment, scheduled_time: e.target.value})} /></div>
            </div>
            <Separator />
            <p className="text-sm font-semibold text-slate-700">Datos del Operador</p>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nombre Operador *</Label><Input value={newAppointment.operator_name} onChange={e => setNewAppointment({...newAppointment, operator_name: e.target.value})} placeholder="Nombre completo" /></div>
              <div><Label>No. Licencia *</Label><Input value={newAppointment.operator_license} onChange={e => setNewAppointment({...newAppointment, operator_license: e.target.value})} placeholder="LIC-MX-000000" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Póliza de Seguro *</Label><Input value={newAppointment.insurance_policy} onChange={e => setNewAppointment({...newAppointment, insurance_policy: e.target.value})} placeholder="POL-SEG-2024-000" /></div>
              <div><Label>Placas *</Label><Input value={newAppointment.truck_plates} onChange={e => setNewAppointment({...newAppointment, truck_plates: e.target.value})} placeholder="ABC-123-X" /></div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAppointmentModal(false)}>Cancelar</Button>
              <Button onClick={handleCreateAppointment} className="bg-slate-900">Crear Cita</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
