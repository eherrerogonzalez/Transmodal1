import React, { useState, useEffect } from 'react';
import { 
  getPendingOriginOrders, getPendingDistributionOrders,
  confirmOriginOrder, rejectOriginOrder, confirmBulkOriginOrders,
  confirmDistributionOrder, rejectDistributionOrder, confirmBulkDistributionOrders
} from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Checkbox } from '../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Ship, Truck, CheckCircle, XCircle, AlertTriangle, Package,
  ArrowRight, Clock, Store, Building2, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(value);

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

const clientColors = {
  'Walmart': 'bg-blue-600',
  'Costco': 'bg-red-600',
  'HEB': 'bg-red-500',
  'Soriana': 'bg-green-600',
  'La Comer': 'bg-orange-500',
  'Chedraui': 'bg-purple-600',
};

const OrderConfirmations = () => {
  const [loading, setLoading] = useState(true);
  const [originOrders, setOriginOrders] = useState(null);
  const [distributionOrders, setDistributionOrders] = useState(null);
  const [selectedOriginOrders, setSelectedOriginOrders] = useState([]);
  const [selectedDistOrders, setSelectedDistOrders] = useState([]);
  
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmType, setConfirmType] = useState(null); // 'origin' | 'distribution'
  const [orderToConfirm, setOrderToConfirm] = useState(null);
  const [confirmQuantity, setConfirmQuantity] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [originRes, distRes] = await Promise.all([
        getPendingOriginOrders(),
        getPendingDistributionOrders()
      ]);
      setOriginOrders(originRes.data);
      setDistributionOrders(distRes.data);
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      toast.error('Error al cargar órdenes pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrigin = async (order) => {
    setConfirmType('origin');
    setOrderToConfirm(order);
    setConfirmQuantity(order.suggested_quantity.toString());
    setShowConfirmDialog(true);
  };

  const handleConfirmDistribution = async (order) => {
    setConfirmType('distribution');
    setOrderToConfirm(order);
    setConfirmQuantity(order.suggested_quantity.toString());
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      const qty = parseInt(confirmQuantity);
      if (confirmType === 'origin') {
        await confirmOriginOrder(orderToConfirm.id, qty);
        toast.success(`Orden a origen confirmada: ${orderToConfirm.product_name}`);
      } else {
        await confirmDistributionOrder(orderToConfirm.id, qty);
        toast.success(`Distribución confirmada: ${orderToConfirm.product_name} → ${orderToConfirm.client_name}`);
      }
      setShowConfirmDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Error al confirmar orden');
    }
  };

  const handleRejectOrigin = async (order) => {
    try {
      await rejectOriginOrder(order.id, 'Rechazado por usuario');
      toast.info('Orden rechazada');
      fetchData();
    } catch (error) {
      toast.error('Error al rechazar orden');
    }
  };

  const handleRejectDistribution = async (order) => {
    try {
      await rejectDistributionOrder(order.id, 'Rechazado por usuario');
      toast.info('Distribución rechazada');
      fetchData();
    } catch (error) {
      toast.error('Error al rechazar distribución');
    }
  };

  const handleBulkConfirmOrigin = async () => {
    if (selectedOriginOrders.length === 0) return;
    try {
      await confirmBulkOriginOrders(selectedOriginOrders);
      toast.success(`${selectedOriginOrders.length} órdenes a origen confirmadas`);
      setSelectedOriginOrders([]);
      fetchData();
    } catch (error) {
      toast.error('Error al confirmar órdenes');
    }
  };

  const handleBulkConfirmDist = async () => {
    if (selectedDistOrders.length === 0) return;
    try {
      await confirmBulkDistributionOrders(selectedDistOrders);
      toast.success(`${selectedDistOrders.length} distribuciones confirmadas`);
      setSelectedDistOrders([]);
      fetchData();
    } catch (error) {
      toast.error('Error al confirmar distribuciones');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="order-confirmations-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Confirmación de Órdenes</h1>
        <p className="text-slate-500 mt-1">Confirma pedidos a origen y distribuciones a clientes finales</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-orange-200 bg-orange-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-orange-600 uppercase tracking-wider font-medium">Pedidos Origen</p>
            <p className="text-2xl font-bold text-orange-700">{originOrders?.total || 0}</p>
            <p className="text-xs text-orange-500">{originOrders?.emergency_count || 0} emergencias</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 uppercase tracking-wider font-medium">Distribuciones</p>
            <p className="text-2xl font-bold text-blue-700">{distributionOrders?.total || 0}</p>
            <p className="text-xs text-blue-500">{distributionOrders?.critical_count || 0} críticas</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium">Contenedores</p>
            <p className="text-2xl font-bold text-slate-700">{originOrders?.total_containers_needed || 0}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 rounded-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-600 uppercase tracking-wider font-medium">Unidades Dist.</p>
            <p className="text-2xl font-bold text-slate-700">{formatNumber(distributionOrders?.total_units || 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="origin" className="space-y-4">
        <TabsList className="bg-slate-100 rounded-sm">
          <TabsTrigger value="origin" className="rounded-sm data-[state=active]:bg-white">
            <Ship className="w-4 h-4 mr-2" />
            Pedidos a Origen ({originOrders?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="distribution" className="rounded-sm data-[state=active]:bg-white">
            <Truck className="w-4 h-4 mr-2" />
            Distribuciones ({distributionOrders?.total || 0})
          </TabsTrigger>
        </TabsList>

        {/* Origin Orders Tab */}
        <TabsContent value="origin" className="space-y-4">
          {selectedOriginOrders.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-sm border border-orange-200">
              <span className="text-sm text-orange-700">
                {selectedOriginOrders.length} orden(es) seleccionada(s)
              </span>
              <Button onClick={handleBulkConfirmOrigin} className="bg-orange-600 hover:bg-orange-700 rounded-sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Seleccionadas
              </Button>
            </div>
          )}

          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {originOrders?.pending_orders?.map((order, idx) => {
                const isEmergency = order.reason.includes('EMERGENCIA');
                return (
                  <Card 
                    key={order.id || idx} 
                    className={`rounded-sm border-2 ${isEmergency ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedOriginOrders.includes(order.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedOriginOrders([...selectedOriginOrders, order.id]);
                            } else {
                              setSelectedOriginOrders(selectedOriginOrders.filter(id => id !== order.id));
                            }
                          }}
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={brandColors[order.brand] || 'bg-slate-100'}>{order.brand}</Badge>
                            {isEmergency && <Badge className="bg-red-600 text-white">🚨 EMERGENCIA</Badge>}
                            <span className="text-xs text-slate-500 font-mono ml-auto">{order.sku}</span>
                          </div>
                          
                          <h3 className="font-semibold text-slate-900">{order.product_name}</h3>
                          <p className="text-sm text-slate-600 mt-1">{order.reason}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-3 bg-white/50 rounded-sm">
                            <div>
                              <p className="text-xs text-slate-500">Cantidad Sugerida</p>
                              <p className="font-bold text-lg">{formatNumber(order.suggested_quantity)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Origen</p>
                              <p className="font-semibold">{order.suggested_origin}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Lead Time</p>
                              <p className="font-semibold">{order.lead_time_days} días</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Llegada Esperada</p>
                              <p className="font-semibold">{order.expected_arrival}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                            <span>Stock CEDIS: <strong className="text-red-600">{formatNumber(order.cedis_current_stock)}</strong></span>
                            <span>•</span>
                            <span>Déficit: <strong>{formatNumber(order.cedis_deficit)}</strong></span>
                            <span>•</span>
                            <span>Ubicaciones críticas: <strong className="text-red-600">{order.critical_end_locations}</strong></span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button 
                            onClick={() => handleConfirmOrigin(order)}
                            className="bg-emerald-600 hover:bg-emerald-700 rounded-sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirmar
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => handleRejectOrigin(order)}
                            className="rounded-sm text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Distribution Orders Tab */}
        <TabsContent value="distribution" className="space-y-4">
          {selectedDistOrders.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-sm border border-blue-200">
              <span className="text-sm text-blue-700">
                {selectedDistOrders.length} distribución(es) seleccionada(s)
              </span>
              <Button onClick={handleBulkConfirmDist} className="bg-blue-600 hover:bg-blue-700 rounded-sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar Seleccionadas
              </Button>
            </div>
          )}

          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {distributionOrders?.pending_orders?.map((order, idx) => {
                const isCritical = order.priority === 'critical';
                const clientColor = clientColors[order.client_name] || 'bg-slate-600';
                
                return (
                  <Card 
                    key={order.id || idx} 
                    className={`rounded-sm border-2 ${isCritical ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedDistOrders.includes(order.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDistOrders([...selectedDistOrders, order.id]);
                            } else {
                              setSelectedDistOrders(selectedDistOrders.filter(id => id !== order.id));
                            }
                          }}
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={brandColors[order.brand] || 'bg-slate-100'}>{order.brand}</Badge>
                            <div className={`w-6 h-6 rounded-sm ${clientColor} flex items-center justify-center`}>
                              <Building2 className="w-3 h-3 text-white" />
                            </div>
                            <span className="font-medium">{order.client_name}</span>
                            {isCritical && <Badge className="bg-red-600 text-white">CRÍTICO</Badge>}
                          </div>
                          
                          <h3 className="font-semibold text-slate-900">{order.product_name}</h3>
                          <p className="text-sm text-slate-600">{order.store_name} ({order.store_code})</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 p-3 bg-white/50 rounded-sm">
                            <div>
                              <p className="text-xs text-slate-500">Cantidad</p>
                              <p className="font-bold text-lg">{formatNumber(order.suggested_quantity)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Región</p>
                              <p className="font-semibold">{order.region}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Enviar Antes</p>
                              <p className="font-semibold">{order.ship_by_date}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Tránsito</p>
                              <p className="font-semibold">{order.distribution_time_days}d</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Stock Tienda</p>
                              <p className={`font-bold ${order.days_of_stock_at_store <= 3 ? 'text-red-600' : 'text-slate-900'}`}>
                                {order.days_of_stock_at_store}d
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button 
                            onClick={() => handleConfirmDistribution(order)}
                            className="bg-emerald-600 hover:bg-emerald-700 rounded-sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirmar
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => handleRejectDistribution(order)}
                            className="rounded-sm text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Confirmar {confirmType === 'origin' ? 'Pedido a Origen' : 'Distribución'}
            </DialogTitle>
            <DialogDescription>
              {orderToConfirm?.product_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Badge className={brandColors[orderToConfirm?.brand] || 'bg-slate-100'}>
                {orderToConfirm?.brand}
              </Badge>
              {confirmType === 'distribution' && (
                <span className="text-sm text-slate-500">→ {orderToConfirm?.client_name}</span>
              )}
            </div>
            
            <div>
              <Label htmlFor="quantity">Cantidad a {confirmType === 'origin' ? 'pedir' : 'enviar'}</Label>
              <Input
                id="quantity"
                type="number"
                value={confirmQuantity}
                onChange={(e) => setConfirmQuantity(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Sugerido: {formatNumber(orderToConfirm?.suggested_quantity || 0)} unidades
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSubmit} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Orden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderConfirmations;
