import React from 'react';
import { 
  Truck, 
  MapPinned, 
  Users, 
  Clock,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const stats = [
  { label: 'Unidades Activas', value: '24', icon: Truck, color: 'text-amber-600', bg: 'bg-amber-100' },
  { label: 'En Tránsito', value: '18', icon: Navigation, color: 'text-blue-600', bg: 'bg-blue-100' },
  { label: 'Operadores', value: '32', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
  { label: 'Viajes Hoy', value: '47', icon: MapPinned, color: 'text-emerald-600', bg: 'bg-emerald-100' },
];

const activeTrips = [
  { id: 'VIA-001', unit: 'T-2847', driver: 'Juan Pérez', origin: 'Veracruz', destination: 'CDMX', eta: '14:30', progress: 65 },
  { id: 'VIA-002', unit: 'T-1923', driver: 'Carlos López', origin: 'Manzanillo', destination: 'Guadalajara', eta: '16:45', progress: 40 },
  { id: 'VIA-003', unit: 'T-3102', driver: 'Miguel Torres', origin: 'Lázaro Cárdenas', destination: 'CDMX', eta: '18:00', progress: 25 },
  { id: 'VIA-004', unit: 'T-4521', driver: 'Roberto Díaz', origin: 'CDMX', destination: 'Monterrey', eta: '22:30', progress: 10 },
];

const alerts = [
  { type: 'warning', message: 'Unidad T-2847: Bajo nivel de combustible', time: '5 min' },
  { type: 'info', message: 'Operador Juan Pérez: Descanso programado', time: '20 min' },
  { type: 'success', message: 'Entrega completada: VIA-098', time: '35 min' },
];

export default function TransportDashboard() {
  return (
    <div className="space-y-6" data-testid="transport-dashboard">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard de Transporte</h1>
          <p className="text-slate-500">Control de flota y operadores</p>
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
        {/* Active trips */}
        <Card className="lg:col-span-2 bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="w-5 h-5 text-amber-600" />
              Viajes en Curso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeTrips.map((trip) => (
                <div key={trip.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Truck className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{trip.unit}</p>
                        <p className="text-sm text-slate-500">{trip.driver}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">ETA</p>
                      <p className="font-medium text-slate-800">{trip.eta}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                    <span>{trip.origin}</span>
                    <span className="text-slate-300">→</span>
                    <span>{trip.destination}</span>
                  </div>
                  <div className="relative pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">Progreso</span>
                      <span className="text-xs font-medium text-amber-600">{trip.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full transition-all"
                        style={{ width: `${trip.progress}%` }}
                      />
                    </div>
                  </div>
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

      {/* Map placeholder */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPinned className="w-5 h-5 text-amber-600" />
            Rastreo en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gradient-to-br from-amber-50 to-slate-50 rounded-lg flex items-center justify-center border-2 border-dashed border-amber-200">
            <div className="text-center">
              <MapPinned className="w-12 h-12 text-amber-300 mx-auto mb-3" />
              <p className="text-slate-500">Mapa de rastreo GPS</p>
              <p className="text-sm text-slate-400">Integración con Google Maps próximamente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
