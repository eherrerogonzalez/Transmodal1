import React, { useState, useEffect } from 'react';
import { getInventory, getContainersByProduct, getRestockPlan } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  Package, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Warehouse,
  TrendingUp,
  Search,
  Filter,
  Calendar,
  Truck,
  ArrowRight,
  Settings,
  Wine,
  Box
} from 'lucide-react';
import { toast } from 'sonner';

const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(value);

const stockStatusConfig = {
  critical: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Crítico', icon: AlertTriangle },
  low: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Bajo', icon: Clock },
  optimal: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Óptimo', icon: CheckCircle },
  excess: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Exceso', icon: Package },
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

const Inventory = () => {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState(null);
  const [containers, setContainers] = useState(null);
  const [restockPlan, setRestockPlan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseDoors, setWarehouseDoors] = useState(8);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [warehouseDoors]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, contRes, planRes] = await Promise.all([
        getInventory(),
        getContainersByProduct(),
        getRestockPlan(warehouseDoors)
      ]);
      setInventory(invRes.data);
      setContainers(contRes.data);
      setRestockPlan(planRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos de inventario');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  // Filter inventory
  const filteredInventory = inventory?.inventory?.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = brandFilter === 'all' || item.brand === brandFilter;
    const matchesStatus = statusFilter === 'all' || item.stock_status === statusFilter;
    return matchesSearch && matchesBrand && matchesStatus;
  }) || [];

  const brands = [...new Set(inventory?.inventory?.map(i => i.brand) || [])];

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
          <p className="text-slate-500 mt-1">Gestión de stock y priorización de entregas - Pernod Ricard</p>
        </div>
        
        {/* Warehouse Config */}
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <Warehouse className="w-5 h-5 text-slate-400" />
            <div className="flex items-center gap-2">
              <Label className="text-sm">Puertas:</Label>
              <Input
                type="number"
                value={warehouseDoors}
                onChange={(e) => setWarehouseDoors(parseInt(e.target.value) || 8)}
                className="w-16 h-8 rounded-sm"
                min="1"
                max="20"
              />
            </div>
            <span className="text-sm text-slate-500">= {warehouseDoors} contenedores/día</span>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50 rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 uppercase tracking-wider font-medium">Crítico</p>
                <p className="text-3xl font-bold text-red-700">{inventory?.summary?.critical || 0}</p>
                <p className="text-xs text-red-500">Requiere acción inmediata</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50 rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 uppercase tracking-wider font-medium">Stock Bajo</p>
                <p className="text-3xl font-bold text-amber-700">{inventory?.summary?.low || 0}</p>
                <p className="text-xs text-amber-500">Por debajo del mínimo</p>
              </div>
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50 rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 uppercase tracking-wider font-medium">Óptimo</p>
                <p className="text-3xl font-bold text-emerald-700">{inventory?.summary?.optimal || 0}</p>
                <p className="text-xs text-emerald-500">Nivel adecuado</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 rounded-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 uppercase tracking-wider font-medium">En Tránsito</p>
                <p className="text-3xl font-bold text-blue-700">{containers?.summary?.total_containers || 0}</p>
                <p className="text-xs text-blue-500">Contenedores próximos</p>
              </div>
              <Truck className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="bg-slate-100 rounded-sm">
          <TabsTrigger value="inventory" className="rounded-sm data-[state=active]:bg-white">
            <Box className="w-4 h-4 mr-2" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="containers" className="rounded-sm data-[state=active]:bg-white">
            <Package className="w-4 h-4 mr-2" />
            Contenedores en Tránsito
          </TabsTrigger>
          <TabsTrigger value="schedule" className="rounded-sm data-[state=active]:bg-white">
            <Calendar className="w-4 h-4 mr-2" />
            Plan de Entregas
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar producto, SKU o marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-sm"
              />
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-full sm:w-48 rounded-sm">
                <Wine className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {brands.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 rounded-sm">
                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="low">Bajo</SelectItem>
                <SelectItem value="optimal">Óptimo</SelectItem>
                <SelectItem value="excess">Exceso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inventory Table */}
          <Card className="border-slate-200 rounded-sm shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Producto</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase">Marca</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-right">Stock Actual</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-right">Stock Mínimo</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-center">Nivel</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-center">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-right">Días Stock</TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase text-right">Prioridad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item, idx) => {
                    const statusConf = stockStatusConfig[item.stock_status];
                    const stockPercent = Math.min((item.current_stock / item.minimum_stock) * 50, 100);
                    
                    return (
                      <TableRow 
                        key={item.sku}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => handleViewProduct(item)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-sm ${brandColors[item.brand] || 'bg-slate-100 text-slate-700'}`}>
                            {item.brand}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNumber(item.current_stock)}
                        </TableCell>
                        <TableCell className="text-right text-slate-500">
                          {formatNumber(item.minimum_stock)}
                        </TableCell>
                        <TableCell>
                          <div className="w-24 mx-auto">
                            <Progress 
                              value={stockPercent} 
                              className={`h-2 ${item.stock_status === 'critical' ? '[&>div]:bg-red-500' : item.stock_status === 'low' ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`rounded-sm ${statusConf.color}`}>
                            {statusConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={item.days_of_stock < 7 ? 'text-red-600 font-bold' : 'text-slate-600'}>
                            {item.days_of_stock} días
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.priority_score > 0 && (
                            <Badge className={`rounded-sm ${item.priority_score >= 70 ? 'bg-red-100 text-red-700' : item.priority_score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                              {item.priority_score.toFixed(0)}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Containers Tab */}
        <TabsContent value="containers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-red-200 bg-red-50 rounded-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-red-600 uppercase tracking-wider">Entregas Críticas</p>
                <p className="text-3xl font-bold text-red-700">{containers?.summary?.critical_deliveries || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50 rounded-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-amber-600 uppercase tracking-wider">Alta Prioridad</p>
                <p className="text-3xl font-bold text-amber-700">{containers?.summary?.high_priority_deliveries || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 rounded-sm">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-500 uppercase tracking-wider">Productos en Restock</p>
                <p className="text-3xl font-bold text-slate-900">{containers?.summary?.products_being_restocked || 0}</p>
              </CardContent>
            </Card>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-4">
              {containers?.products_in_transit?.map((product, idx) => {
                const urgency = urgencyConfig[product.delivery_urgency];
                
                return (
                  <Card key={product.sku} className={`border-l-4 ${urgency.color} rounded-sm shadow-sm`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={brandColors[product.brand] || 'bg-slate-100'}>{product.brand}</Badge>
                            <Badge variant="outline" className={`rounded-sm ${urgency.text}`}>
                              Prioridad: {urgency.label}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900">{product.product_name}</h3>
                          <p className="text-sm text-slate-500 font-mono">{product.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Score Prioridad</p>
                          <p className={`text-2xl font-bold ${product.priority_score >= 70 ? 'text-red-600' : product.priority_score >= 40 ? 'text-amber-600' : 'text-slate-600'}`}>
                            {product.priority_score.toFixed(0)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 p-3 bg-slate-50 rounded-sm mb-4">
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Stock Actual</p>
                          <p className={`text-lg font-bold ${product.current_stock < product.minimum_stock ? 'text-red-600' : 'text-slate-900'}`}>
                            {formatNumber(product.current_stock)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Stock Mínimo</p>
                          <p className="text-lg font-semibold text-slate-700">{formatNumber(product.minimum_stock)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase">En Tránsito</p>
                          <p className="text-lg font-bold text-blue-600">{formatNumber(product.total_units_in_transit)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 uppercase">Contenedores</p>
                          <p className="text-lg font-semibold text-slate-900">{product.containers?.length || 0}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {product.containers?.map((cont, cidx) => (
                          <div key={cidx} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-sm">
                            <div className="flex items-center gap-3">
                              <Package className="w-4 h-4 text-slate-400" />
                              <span className="font-mono text-sm">{cont.container_number}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-slate-600">{formatNumber(cont.quantity)} unidades</span>
                              <Badge variant="outline" className="rounded-sm text-xs">{cont.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card className="border-slate-200 rounded-sm shadow-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Plan de Entregas Priorizado
                <Badge className="ml-2 bg-slate-100 text-slate-700">
                  {restockPlan?.summary?.total_containers_scheduled || 0} contenedores en {restockPlan?.summary?.days_needed || 0} días
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {restockPlan?.calendar?.map((day, idx) => (
                  <div key={day.date} className="border-b border-slate-100 last:border-0">
                    <div className="p-4 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center w-16">
                          <p className="text-2xl font-bold text-slate-900">
                            {new Date(day.date).getDate()}
                          </p>
                          <p className="text-xs text-slate-500 uppercase">
                            {new Date(day.date).toLocaleDateString('es-MX', { month: 'short' })}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{day.day_name}</p>
                          <p className="text-sm text-slate-500">{day.total_containers} de {day.capacity} contenedores</p>
                        </div>
                      </div>
                      <div className="w-32">
                        <Progress 
                          value={(day.total_containers / day.capacity) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {day.deliveries?.map((delivery, didx) => {
                        const urgency = urgencyConfig[delivery.delivery_urgency];
                        
                        return (
                          <div key={didx} className="p-4 flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-4">
                              <div className={`w-1 h-12 rounded-full ${urgency.color}`} />
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                                {delivery.slot_number}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge className={brandColors[delivery.brand] || 'bg-slate-100'} variant="outline">
                                    {delivery.brand}
                                  </Badge>
                                  <span className="font-mono text-xs text-slate-400">{delivery.container_number}</span>
                                </div>
                                <p className="font-medium text-slate-900">{delivery.product_name}</p>
                                <p className="text-xs text-slate-500">{delivery.sku}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-900">{formatNumber(delivery.quantity)}</p>
                              <div className="flex items-center gap-2 text-sm">
                                <span className={delivery.current_stock < delivery.minimum_stock ? 'text-red-600' : 'text-slate-500'}>
                                  {formatNumber(delivery.current_stock)}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="text-emerald-600 font-medium">
                                  {formatNumber(delivery.stock_after_delivery)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Detail Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wine className="w-5 h-5" />
              {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={brandColors[selectedProduct.brand] || 'bg-slate-100'}>
                  {selectedProduct.brand}
                </Badge>
                <Badge variant="outline" className={stockStatusConfig[selectedProduct.stock_status]?.color}>
                  {stockStatusConfig[selectedProduct.stock_status]?.label}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-sm">
                  <p className="text-xs text-slate-500 uppercase">Stock Actual</p>
                  <p className="text-2xl font-bold text-slate-900">{formatNumber(selectedProduct.current_stock)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-sm">
                  <p className="text-xs text-slate-500 uppercase">Stock Mínimo</p>
                  <p className="text-2xl font-bold text-slate-700">{formatNumber(selectedProduct.minimum_stock)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-sm">
                  <p className="text-xs text-slate-500 uppercase">Punto Reorden</p>
                  <p className="text-2xl font-bold text-amber-600">{formatNumber(selectedProduct.reorder_point)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-sm">
                  <p className="text-xs text-slate-500 uppercase">Días de Stock</p>
                  <p className={`text-2xl font-bold ${selectedProduct.days_of_stock < 7 ? 'text-red-600' : 'text-slate-900'}`}>
                    {selectedProduct.days_of_stock}
                  </p>
                </div>
              </div>

              {selectedProduct.units_needed > 0 && (
                <div className="p-4 border border-amber-200 bg-amber-50 rounded-sm">
                  <p className="text-sm text-amber-800">
                    <strong>Se necesitan {formatNumber(selectedProduct.units_needed)} unidades</strong> para alcanzar el punto de reorden.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
