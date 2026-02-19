import React from 'react';
import { 
  Route, 
  MapPin,
  Clock,
  Truck,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const routesData = [
  { id: 'RUT-001', name: 'Veracruz - CDMX', origin: 'Veracruz', destination: 'CDMX', distance: 420, duration: '6h 30m', trips: 45, active: true },
  { id: 'RUT-002', name: 'Manzanillo - Guadalajara', origin: 'Manzanillo', destination: 'Guadalajara', distance: 310, duration: '4h 45m', trips: 32, active: true },
  { id: 'RUT-003', name: 'Lázaro Cárdenas - CDMX', origin: 'Lázaro Cárdenas', destination: 'CDMX', distance: 380, duration: '5h 30m', trips: 28, active: true },
  { id: 'RUT-004', name: 'CDMX - Monterrey', origin: 'CDMX', destination: 'Monterrey', distance: 940, duration: '10h 00m', trips: 18, active: true },
  { id: 'RUT-005', name: 'Veracruz - Puebla', origin: 'Veracruz', destination: 'Puebla', distance: 280, duration: '3h 45m', trips: 22, active: false },
];

export default function OpsTmsRoutes() {
  return (
    <div className="space-y-6" data-testid="ops-tms-routes">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">TMS - Rutas</h1>
          <p className="text-slate-500">Gestión de rutas y trayectos</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700">
          <Route className="w-4 h-4 mr-2" />
          Nueva Ruta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {routesData.map((route) => (
          <Card key={route.id} className={`bg-white border-slate-200 ${!route.active && 'opacity-60'}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-sm text-slate-500">{route.id}</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  route.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {route.active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              
              <h3 className="font-bold text-lg text-slate-800 mb-3">{route.name}</h3>
              
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">{route.origin}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-red-500" />
                  <span className="font-medium">{route.destination}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center py-3 border-t border-slate-100">
                <div>
                  <p className="text-lg font-bold text-slate-800">{route.distance}</p>
                  <p className="text-xs text-slate-500">km</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800">{route.duration}</p>
                  <p className="text-xs text-slate-500">duración</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">{route.trips}</p>
                  <p className="text-xs text-slate-500">viajes/mes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
