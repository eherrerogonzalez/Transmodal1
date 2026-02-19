import React, { useState } from 'react';
import { 
  MapPin, 
  Search,
  Grid3X3,
  Package,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const warehouseZones = [
  { id: 'A', name: 'Zona A - Electrónicos', rows: 5, cols: 10, ocupacion: 78 },
  { id: 'B', name: 'Zona B - Automotriz', rows: 4, cols: 8, ocupacion: 65 },
  { id: 'C', name: 'Zona C - Construcción', rows: 6, cols: 12, ocupacion: 82 },
  { id: 'D', name: 'Zona D - Textiles', rows: 3, cols: 6, ocupacion: 45 },
  { id: 'E', name: 'Zona E - Refrigerado', rows: 4, cols: 8, ocupacion: 90 },
  { id: 'F', name: 'Zona F - Maquinaria', rows: 2, cols: 4, ocupacion: 50 },
];

const locationDetails = [
  { id: 'A-01-01', zone: 'A', status: 'occupied', sku: 'SKU-8847', qty: 150 },
  { id: 'A-01-02', zone: 'A', status: 'occupied', sku: 'SKU-1234', qty: 200 },
  { id: 'A-01-03', zone: 'A', status: 'occupied', sku: 'SKU-8847', qty: 350 },
  { id: 'A-01-04', zone: 'A', status: 'empty', sku: null, qty: 0 },
  { id: 'B-01-01', zone: 'B', status: 'occupied', sku: 'SKU-2234', qty: 320 },
  { id: 'B-02-01', zone: 'B', status: 'occupied', sku: 'SKU-4456', qty: 1200 },
  { id: 'C-01-01', zone: 'C', status: 'occupied', sku: 'SKU-6678', qty: 890 },
];

export default function OpsWmsLocations() {
  const [selectedZone, setSelectedZone] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLocations = locationDetails.filter(loc => {
    const matchesSearch = loc.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = !selectedZone || loc.zone === selectedZone;
    return matchesSearch && matchesZone;
  });

  const stats = {
    total: locationDetails.length,
    occupied: locationDetails.filter(l => l.status === 'occupied').length,
    empty: locationDetails.filter(l => l.status === 'empty').length,
  };

  return (
    <div className="space-y-6" data-testid="ops-wms-locations">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">WMS - Ubicaciones</h1>
        <p className="text-slate-500">Gestión de espacios y layout del almacén</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Grid3X3 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.occupied}</p>
                <p className="text-xs text-slate-500">Ocupadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.empty}</p>
                <p className="text-xs text-slate-500">Disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            Zonas del Almacén
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouseZones.map((zone) => (
              <button
                key={zone.id}
                onClick={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedZone === zone.id 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-slate-800">Zona {zone.id}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    zone.ocupacion >= 80 ? 'bg-red-100 text-red-700' :
                    zone.ocupacion >= 60 ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {zone.ocupacion}%
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{zone.name}</p>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      zone.ocupacion >= 80 ? 'bg-red-500' :
                      zone.ocupacion >= 60 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                    style={{ width: `${zone.ocupacion}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Detalle de Ubicaciones</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Ubicación</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Zona</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Estado</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">SKU</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((loc) => (
                  <tr key={loc.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm font-medium text-emerald-600">{loc.id}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">Zona {loc.zone}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        loc.status === 'occupied' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {loc.status === 'occupied' ? 'Ocupada' : 'Disponible'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {loc.sku ? <span className="font-mono text-sm">{loc.sku}</span> : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {loc.qty > 0 ? loc.qty.toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
