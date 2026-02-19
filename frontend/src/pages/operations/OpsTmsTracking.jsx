import React from 'react';
import { 
  MapPin, 
  Truck,
  Navigation,
  Clock,
  Fuel,
  Phone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

const activeTrips = [
  { id: 'VIA-001', unit: 'T-2847', driver: 'Juan Pérez', phone: '555-1234', origin: 'Veracruz', destination: 'CDMX', eta: '14:30', progress: 65, speed: 85, fuel: 75 },
  { id: 'VIA-002', unit: 'T-1923', driver: 'Carlos López', phone: '555-5678', origin: 'Manzanillo', destination: 'Guadalajara', eta: '16:45', progress: 40, speed: 78, fuel: 45 },
  { id: 'VIA-003', unit: 'T-3102', driver: 'Miguel Torres', phone: '555-9012', origin: 'Lázaro Cárdenas', destination: 'CDMX', eta: '18:00', progress: 25, speed: 82, fuel: 60 },
  { id: 'VIA-004', unit: 'T-5678', driver: 'Roberto Díaz', phone: '555-3456', origin: 'CDMX', destination: 'Monterrey', eta: '22:30', progress: 10, speed: 90, fuel: 90 },
];

export default function OpsTmsTracking() {
  return (
    <div className="space-y-6" data-testid="ops-tms-tracking">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">TMS - Rastreo GPS</h1>
        <p className="text-slate-500">Seguimiento en tiempo real de unidades</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map placeholder */}
        <Card className="lg:col-span-2 bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-600" />
              Mapa en Tiempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 bg-gradient-to-br from-amber-50 to-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-amber-200">
              <div className="text-center">
                <Navigation className="w-16 h-16 text-amber-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Mapa de Rastreo GPS</p>
                <p className="text-sm text-slate-400">Integración con Google Maps próximamente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active trips list */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-600" />
              Viajes Activos ({activeTrips.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTrips.map((trip) => (
              <div key={trip.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 rounded">
                      <Truck className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-800">{trip.unit}</p>
                      <p className="text-xs text-slate-500">{trip.driver}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Phone className="w-4 h-4 text-slate-500" />
                  </Button>
                </div>
                
                <div className="text-xs text-slate-600 mb-2">
                  {trip.origin} → {trip.destination}
                </div>
                
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-500">Progreso</span>
                  <span className="font-medium text-amber-600">{trip.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div 
                    className="bg-amber-500 h-1.5 rounded-full"
                    style={{ width: `${trip.progress}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ETA: {trip.eta}
                  </span>
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {trip.speed} km/h
                  </span>
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3 h-3" />
                    {trip.fuel}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
