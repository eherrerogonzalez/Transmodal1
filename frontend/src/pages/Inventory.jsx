import React, { useState, useEffect } from 'react';
import { 
  getInventory, getContainersByProduct, getRestockPlan, 
  getProductPositions, createProduct, getWarehouseZones,
  getAppointments, createAppointment, updateAppointmentStatus
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
  DoorOpen, User, FileText, Shield, Car
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
  critical: { color: 'bg-red-500', text: 'text-red-700', label: 'Crítica' },
  high: { color: 'bg-amber-500', text: 'text-amber-700', label: 'Alta' },
  medium: { color: 'bg-blue-500', text: 'text-blue-700', label: 'Media' },
  low: { color: 'bg-slate-400', text: 'text-slate-600', label: 'Baja' },
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

const Inventory = () => {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState(null);
  const [containers, setContainers] = useState(null);
  const [restockPlan, setRestockPlan] = useState(null);
  const [appointments, setAppointments] = useState(null);
  const [zones, setZones] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseDoors, setWarehouseDoors] = useState(8);
  
  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showPositionsModal, setShowPositionsModal] = useState(false);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productPositions, setProductPositions] = useState(null);
  const [positionsLoading, setPositionsLoading] = useState(false);
  
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
      const [invRes, contRes, planRes, apptRes, zonesRes] = await Promise.all([
        getInventory(),
        getContainersByProduct(),
        getRestockPlan(warehouseDoors),
        getAppointments(),
        getWarehouseZones()
      ]);
      setInventory(invRes.data);
      setContainers(contRes.data);
      setRestockPlan(planRes.data);
      setAppointments(apptRes.data);
      setZones(zonesRes.data);
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Inventario CEDIS</h1>
          <p className="text-slate-500 mt-1">Gestión de stock, posiciones y citas - Pernod Ricard</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={() => setShowNewProductModal(true)} className="rounded-sm bg-slate-900">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
          <Button onClick={() => setShowAppointmentModal(true)} variant="outline" className="rounded-sm">
            <Calendar className="w-4 h-4 mr-2" />
            Nueva Cita
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-red-200 bg-red-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-sm text-red-600 uppercase tracking-wider font-medium">Crítico</p>
            <p className="text-3xl font-bold text-red-700">{inventory?.summary?.critical || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-sm text-amber-600 uppercase tracking-wider font-medium">Stock Bajo</p>
            <p className="text-3xl font-bold text-amber-700">{inventory?.summary?.low || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-sm text-emerald-600 uppercase tracking-wider font-medium">Óptimo</p>
            <p className="text-3xl font-bold text-emerald-700">{inventory?.summary?.optimal || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-sm text-blue-600 uppercase tracking-wider font-medium">En Tránsito</p>
            <p className="text-3xl font-bold text-blue-700">{containers?.summary?.total_containers || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-sm text-purple-600 uppercase tracking-wider font-medium">Citas Hoy</p>
            <p className="text-3xl font-bold text-purple-700">{appointments?.by_status?.scheduled || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="bg-slate-100 rounded-sm">
          <TabsTrigger value="inventory" className="rounded-sm data-[state=active]:bg-white">
            <Box className="w-4 h-4 mr-2" />Inventario
          </TabsTrigger>
          <TabsTrigger value="positions" className="rounded-sm data-[state=active]:bg-white">
            <Grid3X3 className="w-4 h-4 mr-2" />Posiciones
          </TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-sm data-[state=active]:bg-white">
            <Calendar className="w-4 h-4 mr-2" />Citas
          </TabsTrigger>
          <TabsTrigger value="containers" className="rounded-sm data-[state=active]:bg-white">
            <Package className="w-4 h-4 mr-2" />En Tránsito
          </TabsTrigger>
        </TabsList>

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

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {zones?.zones?.map(zone => (
              <Card key={zone.zone_id} className="border-slate-200 rounded-sm shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${zoneColors[zone.zone_id]}`} />
                    {zone.zone_id} - {zone.categories[0]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">{zone.description}</p>
                  <p className="text-xs text-slate-400 mt-1">{zone.categories.join(', ')}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-slate-200 rounded-sm">
            <CardHeader>
              <CardTitle className="text-lg">Mapa de Almacén</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-8 gap-2">
                {[...Array(8)].map((_, doorIdx) => (
                  <div key={doorIdx} className="text-center">
                    <div className="w-full h-12 bg-slate-800 rounded-t-sm flex items-center justify-center">
                      <DoorOpen className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-xs font-bold mt-1">Puerta {doorIdx + 1}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-4 mt-6">
                {['A', 'B', 'C', 'D', 'E'].map(zone => (
                  <div key={zone} className={`p-4 rounded-sm ${zoneColors[zone]} text-white text-center`}>
                    <p className="font-bold text-lg">Zona {zone}</p>
                    <p className="text-sm opacity-90">{zones?.zones?.find(z => z.zone_id === zone)?.categories[0]}</p>
                  </div>
                ))}
              </div>
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
                  <Card key={product.sku} className={`border-l-4 ${urgency.color} rounded-sm`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={brandColors[product.brand] || 'bg-slate-100'}>{product.brand}</Badge>
                        <Badge variant="outline" className={`rounded-sm ${urgency.text}`}>Prioridad: {urgency.label}</Badge>
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
