import React, { useState, useEffect } from 'react';
import { 
  getInventory, getContainersByProduct, getRestockPlan, 
  getProductPositions, createProduct, getWarehouseZones,
  getAppointments, createAppointment, getRestockPredictions,
  getRestockTimeline, getEndClientsOverview, getEndClientInventory
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
  TrendingDown, Route, CalendarClock
} from 'lucide-react';
import { toast } from 'sonner';

const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(value);

const stockStatusConfig = {
  critical: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Crítico' },
  low: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Bajo' },
  optimal: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Óptimo' },
  excess: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Exceso' },
};

const urgencyConfig = {
  critical: { color: 'bg-red-500', text: 'text-red-700', label: 'Crítica', bgLight: 'bg-red-50 border-red-200' },
  high: { color: 'bg-amber-500', text: 'text-amber-700', label: 'Alta', bgLight: 'bg-amber-50 border-amber-200' },
  medium: { color: 'bg-blue-500', text: 'text-blue-700', label: 'Media', bgLight: 'bg-blue-50 border-blue-200' },
  low: { color: 'bg-slate-400', text: 'text-slate-600', label: 'Baja', bgLight: 'bg-slate-50 border-slate-200' },
  immediate: { color: 'bg-red-600', text: 'text-red-700', label: 'Inmediata', bgLight: 'bg-red-50 border-red-300' },
  soon: { color: 'bg-amber-500', text: 'text-amber-700', label: 'Pronto', bgLight: 'bg-amber-50 border-amber-200' },
  scheduled: { color: 'bg-blue-500', text: 'text-blue-700', label: 'Programada', bgLight: 'bg-blue-50 border-blue-200' },
  ok: { color: 'bg-emerald-500', text: 'text-emerald-700', label: 'OK', bgLight: 'bg-emerald-50 border-emerald-200' },
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
  const [restockPlan, setRestockPlan] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [zones, setZones] = useState(null);
  const [restockPredictions, setRestockPredictions] = useState(null);
  const [restockTimeline, setRestockTimeline] = useState(null);
  const [endClientsOverview, setEndClientsOverview] = useState(null);
  const [selectedClientInventory, setSelectedClientInventory] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseDoors, setWarehouseDoors] = useState(8);
  
  // Modals
  const [showPositionsModal, setShowPositionsModal] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showClientDetailModal, setShowClientDetailModal] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productPositions, setProductPositions] = useState(null);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [clientDetailLoading, setClientDetailLoading] = useState(false);
  
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
  }, [warehouseDoors]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, contRes, planRes, apptRes, zonesRes, predictRes, timelineRes, clientsRes] = await Promise.all([
        getInventory(),
        getContainersByProduct(),
        getRestockPlan(warehouseDoors),
        getAppointments(),
        getWarehouseZones(),
        getRestockPredictions(),
        getRestockTimeline(30),
        getEndClientsOverview()
      ]);
      setInventory(invRes.data);
      setContainers(contRes.data);
      setRestockPlan(planRes.data);
      setAppointments(apptRes.data);
      setZones(zonesRes.data);
      setRestockPredictions(predictRes.data);
      setRestockTimeline(timelineRes.data);
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventario & Planificación</h1>
          <p className="text-slate-500 mt-1">Gestión de stock, tiempos de tránsito y clientes finales</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="border-red-200 bg-red-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-red-600 uppercase tracking-wider font-medium">Crítico CEDIS</p>
            <p className="text-2xl font-bold text-red-700">{inventory?.summary?.critical || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wider font-medium">Pedir Inmediato</p>
            <p className="text-2xl font-bold text-amber-700">{restockPredictions?.summary?.immediate_action_required || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 uppercase tracking-wider font-medium">En Tránsito</p>
            <p className="text-2xl font-bold text-blue-700">{containers?.summary?.total_containers || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-purple-600 uppercase tracking-wider font-medium">Clientes Finales</p>
            <p className="text-2xl font-bold text-purple-700">{endClientsOverview?.total_clients || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-orange-600 uppercase tracking-wider font-medium">Críticos Retail</p>
            <p className="text-2xl font-bold text-orange-700">{endClientsOverview?.total_critical_items || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-emerald-600 uppercase tracking-wider font-medium">Lead Time Prom.</p>
            <p className="text-2xl font-bold text-emerald-700">{restockPredictions?.summary?.avg_lead_time_days || 0}d</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transit-planning" className="space-y-6">
        <TabsList className="bg-slate-100 rounded-sm flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="transit-planning" className="rounded-sm data-[state=active]:bg-white" data-testid="tab-transit-planning">
            <Ship className="w-4 h-4 mr-2" />Planif. Tránsito
          </TabsTrigger>
          <TabsTrigger value="end-clients" className="rounded-sm data-[state=active]:bg-white" data-testid="tab-end-clients">
            <Store className="w-4 h-4 mr-2" />Clientes Finales
          </TabsTrigger>
          <TabsTrigger value="inventory" className="rounded-sm data-[state=active]:bg-white" data-testid="tab-inventory">
            <Box className="w-4 h-4 mr-2" />Inventario CEDIS
          </TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-sm data-[state=active]:bg-white" data-testid="tab-appointments">
            <Calendar className="w-4 h-4 mr-2" />Citas
          </TabsTrigger>
          <TabsTrigger value="containers" className="rounded-sm data-[state=active]:bg-white" data-testid="tab-containers">
            <Package className="w-4 h-4 mr-2" />En Tránsito
          </TabsTrigger>
        </TabsList>

        {/* Transit Planning Tab - NEW */}
        <TabsContent value="transit-planning" className="space-y-6" data-testid="transit-planning-content">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Restock Predictions */}
            <Card className="border-slate-200 rounded-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Timer className="w-5 h-5 text-blue-600" />
                  Predicción de Reabastecimiento
                </CardTitle>
                <p className="text-sm text-slate-500">Cuándo pedir a origen considerando tiempo de tránsito</p>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {restockPredictions?.predictions?.slice(0, 15).map((pred, idx) => {
                      const urgConf = urgencyConfig[pred.urgency_level] || urgencyConfig.ok;
                      return (
                        <div key={idx} className={`p-3 rounded-sm border ${urgConf.bgLight}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={brandColors[pred.brand] || 'bg-slate-100'}>{pred.brand}</Badge>
                              <Badge variant="outline" className={`rounded-sm ${urgConf.text} border-current`}>
                                {urgConf.label}
                              </Badge>
                            </div>
                            <span className="text-xs text-slate-500 font-mono">{pred.sku}</span>
                          </div>
                          <p className="font-semibold text-slate-900 text-sm">{pred.product_name}</p>
                          
                          <div className="grid grid-cols-2 gap-4 mt-3 text-xs">
                            <div>
                              <p className="text-slate-500">Stock Actual</p>
                              <p className="font-bold text-lg">{formatNumber(pred.current_stock)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Días hasta agotarse</p>
                              <p className={`font-bold text-lg ${pred.days_until_stockout <= 7 ? 'text-red-600' : 'text-slate-900'}`}>
                                {pred.days_until_stockout < 999 ? `${pred.days_until_stockout}d` : 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-3 p-2 bg-white/50 rounded-sm">
                            <div className="flex items-center gap-2 text-xs">
                              <Route className="w-4 h-4 text-slate-400" />
                              <span className="font-medium">{pred.route_details?.origin}</span>
                              <ArrowRight className="w-3 h-3" />
                              <span className="font-medium">{pred.route_details?.destination}</span>
                              <Badge variant="outline" className="ml-auto text-xs">
                                {pred.transit_time_days} días
                              </Badge>
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-slate-600">
                              <span>📅 Pedir: <strong>{pred.reorder_point_date}</strong></span>
                              <span>📦 Llega: <strong>{pred.expected_delivery_date}</strong></span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="border-slate-200 rounded-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarClock className="w-5 h-5 text-purple-600" />
                  Línea de Tiempo - Próximos 30 días
                </CardTitle>
                <p className="text-sm text-slate-500">Pedidos a origen y entregas esperadas</p>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Pedidos: {restockTimeline?.total_orders_planned || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Entregas: {restockTimeline?.total_deliveries_expected || 0}</span>
                  </div>
                </div>
                <ScrollArea className="h-[380px]">
                  <div className="space-y-3">
                    {restockTimeline?.timeline?.map((day, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{day.date}</span>
                            <Badge variant="outline" className="text-xs">{day.day_name}</Badge>
                          </div>
                          <div className="flex gap-2">
                            {day.orders_count > 0 && (
                              <Badge className="bg-amber-100 text-amber-700 rounded-sm">
                                {day.orders_count} pedidos
                              </Badge>
                            )}
                            {day.deliveries_count > 0 && (
                              <Badge className="bg-emerald-100 text-emerald-700 rounded-sm">
                                {day.deliveries_count} entregas
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {day.orders_to_place.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-amber-600 font-medium mb-1">📤 PEDIR A ORIGEN:</p>
                            {day.orders_to_place.map((order, oIdx) => (
                              <div key={oIdx} className="text-xs bg-amber-50 p-2 rounded mb-1 flex justify-between">
                                <span>{order.product_name}</span>
                                <span className="text-slate-500">{order.origin} • {formatNumber(order.quantity)} uds</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {day.deliveries_expected.length > 0 && (
                          <div>
                            <p className="text-xs text-emerald-600 font-medium mb-1">📥 ENTREGAS ESPERADAS:</p>
                            {day.deliveries_expected.map((del, dIdx) => (
                              <div key={dIdx} className="text-xs bg-emerald-50 p-2 rounded mb-1 flex justify-between">
                                <span>{del.product_name}</span>
                                <span className="text-slate-500">{formatNumber(del.quantity)} uds</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* End Clients Tab - NEW */}
        <TabsContent value="end-clients" className="space-y-6" data-testid="end-clients-content">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Inventario de Clientes Finales</h3>
              <p className="text-sm text-slate-500">Visibilidad de stock en tiendas de retail (Walmart, Costco, HEB, etc.)</p>
            </div>
          </div>

          {/* Client Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {endClientsOverview?.clients?.map((client, idx) => {
              const clientColor = clientColors[client.client_name] || 'bg-slate-600';
              const isUrgent = client.restock_urgency === 'critical';
              const isHigh = client.restock_urgency === 'high';
              
              return (
                <Card 
                  key={idx} 
                  className={`border-2 rounded-sm cursor-pointer transition-all hover:shadow-md ${
                    isUrgent ? 'border-red-300 bg-red-50' : isHigh ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                  }`}
                  onClick={() => handleViewClientDetail(client.client_name)}
                  data-testid={`client-card-${client.client_name}`}
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
                      {isHigh && !isUrgent && <Badge className="bg-amber-600 text-white ml-auto">ALTO</Badge>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/70 p-2 rounded-sm">
                        <p className="text-xs text-slate-500">Productos</p>
                        <p className="font-bold">{formatNumber(client.products_tracked)}</p>
                      </div>
                      <div className="bg-white/70 p-2 rounded-sm">
                        <p className="text-xs text-slate-500">Necesitan Restock</p>
                        <p className="font-bold text-amber-600">{formatNumber(client.items_needing_restock)}</p>
                      </div>
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

          {/* Summary Stats */}
          <Card className="border-slate-200 rounded-sm">
            <CardHeader>
              <CardTitle className="text-lg">Resumen Total de Clientes Finales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-sm">
                  <p className="text-3xl font-bold text-slate-900">{endClientsOverview?.total_clients || 0}</p>
                  <p className="text-sm text-slate-500">Clientes</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-sm">
                  <p className="text-3xl font-bold text-red-600">{endClientsOverview?.total_critical_items || 0}</p>
                  <p className="text-sm text-red-500">Items Críticos</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-sm">
                  <p className="text-3xl font-bold text-amber-600">{endClientsOverview?.total_restock_items || 0}</p>
                  <p className="text-sm text-amber-500">Necesitan Restock</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-sm">
                  <p className="text-3xl font-bold text-blue-600">
                    {formatNumber(endClientsOverview?.clients?.reduce((sum, c) => sum + c.total_units_to_ship, 0) || 0)}
                  </p>
                  <p className="text-sm text-blue-500">Unidades a Enviar</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 rounded-sm">
                <Filter className="w-4 h-4 mr-2 text-slate-400" /><SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="low">Bajo</SelectItem>
                <SelectItem value="optimal">Óptimo</SelectItem>
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
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-center">Nivel</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-center">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-center">Posiciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => {
                    const statusConf = stockStatusConfig[item.stock_status];
                    const stockPercent = Math.min((item.current_stock / item.minimum_stock) * 50, 100);
                    
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
                          <span className="text-slate-400 text-sm"> / {formatNumber(item.minimum_stock)}</span>
                        </TableCell>
                        <TableCell>
                          <Progress value={stockPercent} className={`h-2 w-20 mx-auto ${item.stock_status === 'critical' ? '[&>div]:bg-red-500' : item.stock_status === 'low' ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`} />
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
            <h3 className="text-lg font-semibold">Citas de Entrega</h3>
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
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={brandColors[appt.brand] || 'bg-slate-100'}>{appt.brand}</Badge>
                            <Badge variant="outline" className={`rounded-sm ${statusConf?.color}`}>{statusConf?.label}</Badge>
                            <Badge variant="outline" className="rounded-sm bg-slate-100">
                              <DoorOpen className="w-3 h-3 mr-1" />Puerta {appt.assigned_door}
                            </Badge>
                          </div>
                          <p className="font-semibold text-slate-900">{appt.product_name}</p>
                          <p className="text-sm text-slate-500 font-mono">{appt.container_number}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-3 bg-slate-50 rounded-sm">
                            <div>
                              <p className="text-xs text-slate-500 uppercase">Fecha/Hora</p>
                              <p className="font-medium">{appt.scheduled_date} {appt.scheduled_time}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase flex items-center gap-1">
                                <User className="w-3 h-3" />Operador
                              </p>
                              <p className="font-medium">{appt.operator_name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase flex items-center gap-1">
                                <FileText className="w-3 h-3" />Licencia
                              </p>
                              <p className="font-mono text-sm">{appt.operator_license}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 uppercase flex items-center gap-1">
                                <Shield className="w-3 h-3" />Póliza
                              </p>
                              <p className="font-mono text-sm">{appt.insurance_policy}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                            <Car className="w-4 h-4" />
                            <span>Placas: {appt.truck_plates}</span>
                            <span className="mx-2">|</span>
                            <span>{formatNumber(appt.quantity)} unidades</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Containers Tab */}
        <TabsContent value="containers" className="space-y-4">
          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {containers?.products_in_transit?.map((product, idx) => {
                const urgency = urgencyConfig[product.delivery_urgency];
                return (
                  <Card key={product.sku} className={`border-l-4 ${urgency?.color || 'border-slate-400'} rounded-sm`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={brandColors[product.brand] || 'bg-slate-100'}>{product.brand}</Badge>
                        <Badge variant="outline" className={`rounded-sm ${urgency?.text || 'text-slate-600'}`}>Prioridad: {urgency?.label || 'N/A'}</Badge>
                      </div>
                      <h3 className="font-semibold text-slate-900">{product.product_name}</h3>
                      <div className="grid grid-cols-4 gap-4 mt-3 p-3 bg-slate-50 rounded-sm">
                        <div><p className="text-xs text-slate-500">Stock Actual</p><p className="font-bold text-red-600">{formatNumber(product.current_stock)}</p></div>
                        <div><p className="text-xs text-slate-500">Mínimo</p><p className="font-semibold">{formatNumber(product.minimum_stock)}</p></div>
                        <div><p className="text-xs text-slate-500">En Tránsito</p><p className="font-bold text-blue-600">{formatNumber(product.total_units_in_transit)}</p></div>
                        <div><p className="text-xs text-slate-500">Contenedores</p><p className="font-semibold">{product.containers?.length}</p></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

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
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{productPositions.product_name}</p>
                    <p className="text-sm text-slate-500">{productPositions.brand} - {productPositions.sku}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-emerald-100 text-emerald-700 rounded-sm">
                      <DoorOpen className="w-3 h-3 mr-1" />
                      Puerta Recomendada: {productPositions.recommended_door}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {Object.entries(productPositions.zone_distribution || {}).map(([zone, data]) => (
                  <div key={zone} className={`p-3 rounded-sm text-white ${zoneColors[zone]}`}>
                    <p className="font-bold">Zona {zone}</p>
                    <p className="text-sm">{data.positions} posiciones</p>
                    <p className="text-sm">{formatNumber(data.units)} unidades</p>
                  </div>
                ))}
              </div>

              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posición</TableHead>
                      <TableHead className="text-right">Unidades</TableHead>
                      <TableHead className="text-right">Capacidad</TableHead>
                      <TableHead className="text-center">Puerta Cercana</TableHead>
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
                        <TableCell className="text-right text-slate-500">{formatNumber(pos.capacity)}</TableCell>
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
              Inventario de {selectedClientInventory?.client_name}
            </DialogTitle>
            <DialogDescription>
              Detalle de stock por tienda y producto
            </DialogDescription>
          </DialogHeader>
          {clientDetailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedClientInventory && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-sm text-center">
                  <p className="text-2xl font-bold">{selectedClientInventory.summary?.total_locations}</p>
                  <p className="text-xs text-slate-500">Tiendas</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-sm text-center">
                  <p className="text-2xl font-bold">{selectedClientInventory.summary?.products_tracked}</p>
                  <p className="text-xs text-slate-500">Productos</p>
                </div>
                <div className="p-3 bg-red-50 rounded-sm text-center">
                  <p className="text-2xl font-bold text-red-600">{selectedClientInventory.summary?.critical_stockouts}</p>
                  <p className="text-xs text-red-500">Críticos</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-sm text-center">
                  <p className="text-2xl font-bold text-blue-600">{formatNumber(selectedClientInventory.summary?.total_units_to_ship)}</p>
                  <p className="text-xs text-blue-500">Unidades a Enviar</p>
                </div>
              </div>

              {/* Stores List */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {selectedClientInventory.stores?.slice(0, 10).map((store, idx) => (
                    <Card key={idx} className={`border rounded-sm ${store.critical_count > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold">{store.store_name}</p>
                            <p className="text-xs text-slate-500 font-mono">{store.store_code}</p>
                          </div>
                          <div className="flex gap-2">
                            {store.critical_count > 0 && (
                              <Badge className="bg-red-600 text-white">{store.critical_count} críticos</Badge>
                            )}
                            {store.needs_restock_count > 0 && (
                              <Badge className="bg-amber-100 text-amber-700">{store.needs_restock_count} restock</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {store.products?.slice(0, 4).map((prod, pIdx) => (
                            <div key={pIdx} className={`p-2 rounded-sm text-xs ${prod.days_of_stock <= 3 ? 'bg-red-100' : prod.needs_restock ? 'bg-amber-100' : 'bg-white'}`}>
                              <p className="font-medium truncate">{prod.product_name}</p>
                              <p className="text-slate-500">Stock: {prod.current_stock} ({prod.days_of_stock}d)</p>
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
            <DialogDescription>Agregar un nuevo material al inventario</DialogDescription>
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
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Unidades/Contenedor</Label><Input type="number" value={newProduct.units_per_container} onChange={e => setNewProduct({...newProduct, units_per_container: parseInt(e.target.value)})} /></div>
              <div><Label>Stock Mínimo</Label><Input type="number" value={newProduct.minimum_stock} onChange={e => setNewProduct({...newProduct, minimum_stock: parseInt(e.target.value)})} /></div>
              <div><Label>Stock Máximo</Label><Input type="number" value={newProduct.maximum_stock} onChange={e => setNewProduct({...newProduct, maximum_stock: parseInt(e.target.value)})} /></div>
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
            <DialogTitle>Nueva Cita de Entrega</DialogTitle>
            <DialogDescription>Programar recepción de contenedor</DialogDescription>
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
              <div><Label><User className="w-3 h-3 inline mr-1" />Nombre Operador *</Label><Input value={newAppointment.operator_name} onChange={e => setNewAppointment({...newAppointment, operator_name: e.target.value})} placeholder="Nombre completo" /></div>
              <div><Label><FileText className="w-3 h-3 inline mr-1" />No. Licencia *</Label><Input value={newAppointment.operator_license} onChange={e => setNewAppointment({...newAppointment, operator_license: e.target.value})} placeholder="LIC-MX-000000" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label><Shield className="w-3 h-3 inline mr-1" />Póliza de Seguro *</Label><Input value={newAppointment.insurance_policy} onChange={e => setNewAppointment({...newAppointment, insurance_policy: e.target.value})} placeholder="POL-SEG-2024-000" /></div>
              <div><Label><Car className="w-3 h-3 inline mr-1" />Placas *</Label><Input value={newAppointment.truck_plates} onChange={e => setNewAppointment({...newAppointment, truck_plates: e.target.value})} placeholder="ABC-123-X" /></div>
            </div>
            <div><Label>Notas</Label><Input value={newAppointment.notes} onChange={e => setNewAppointment({...newAppointment, notes: e.target.value})} placeholder="Notas adicionales" /></div>
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
