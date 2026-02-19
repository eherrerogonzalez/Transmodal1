import React from 'react';
import { 
  Package, 
  MapPin, 
  ArrowLeftRight, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  Boxes
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const stats = [
  { label: 'SKUs en Almacén', value: '2,847', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { label: 'Ubicaciones Ocupadas', value: '78%', icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-100' },
  { label: 'Movimientos Hoy', value: '156', icon: ArrowLeftRight, color: 'text-purple-600', bg: 'bg-purple-100' },
  { label: 'Tareas Pendientes', value: '23', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
];

const recentMovements = [
  { id: 'MOV-001', type: 'Entrada', sku: 'SKU-8847', qty: 150, location: 'A-01-03', time: '10:45' },
  { id: 'MOV-002', type: 'Salida', sku: 'SKU-2234', qty: 80, location: 'B-02-01', time: '10:32' },
  { id: 'MOV-003', type: 'Traslado', sku: 'SKU-5521', qty: 200, location: 'C-03-02', time: '10:15' },
  { id: 'MOV-004', type: 'Entrada', sku: 'SKU-1102', qty: 500, location: 'A-02-05', time: '09:58' },
  { id: 'MOV-005', type: 'Salida', sku: 'SKU-7789', qty: 120, location: 'D-01-01', time: '09:45' },
];

const alerts = [
  { type: 'warning', message: 'SKU-3345 por debajo del stock mínimo', time: '5 min' },
  { type: 'info', message: 'Recepción programada: Contenedor MSKU8847621', time: '15 min' },
  { type: 'success', message: 'Picking completado para orden #ORD-2847', time: '22 min' },
];

export default function WmsDashboard() {
  return (
    <div className="space-y-6" data-testid="wms-dashboard">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard WMS</h1>
          <p className="text-slate-500">Gestión de Almacén e Inventario</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent movements */}
        <Card className="lg:col-span-2 bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
              Movimientos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentMovements.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      mov.type === 'Entrada' ? 'bg-emerald-100 text-emerald-700' :
                      mov.type === 'Salida' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {mov.type}
                    </span>
                    <div>
                      <p className="font-medium text-slate-800">{mov.sku}</p>
                      <p className="text-sm text-slate-500">{mov.qty} unidades → {mov.location}</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-400">{mov.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${
                  alert.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                  alert.type === 'success' ? 'bg-emerald-50 border-emerald-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <p className="text-sm text-slate-700">{alert.message}</p>
                  <p className="text-xs text-slate-400 mt-1">Hace {alert.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse map placeholder */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-600" />
            Mapa del Almacén
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gradient-to-br from-emerald-50 to-slate-50 rounded-lg flex items-center justify-center border-2 border-dashed border-emerald-200">
            <div className="text-center">
              <Boxes className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="text-slate-500">Vista del layout del almacén</p>
              <p className="text-sm text-slate-400">Próximamente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
