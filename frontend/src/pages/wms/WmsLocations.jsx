import React, { useState } from 'react';
import { 
  MapPin, 
  Search,
  Grid3X3,
  Package,
  CheckCircle2,
  XCircle,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const warehouseZones = [
  { id: 'A', name: 'Zona A - Electrónicos', rows: 5, cols: 10, ocupacion: 78 },
  { id: 'B', name: 'Zona B - Automotriz', rows: 4, cols: 8, ocupacion: 65 },
  { id: 'C', name: 'Zona C - Construcción', rows: 6, cols: 12, ocupacion: 82 },
  { id: 'D', name: 'Zona D - Textiles', rows: 3, cols: 6, ocupacion: 45 },
  { id: 'E', name: 'Zona E - Alimentos (Refrigerado)', rows: 4, cols: 8, ocupacion: 90 },
  { id: 'F', name: 'Zona F - Maquinaria Pesada', rows: 2, cols: 4, ocupacion: 50 },
];

const locationDetails = [
  { id: 'A-01-01', zone: 'A', status: 'occupied', sku: 'SKU-8847', qty: 150 },
  { id: 'A-01-02', zone: 'A', status: 'occupied', sku: 'SKU-1234', qty: 200 },
  { id: 'A-01-03', zone: 'A', status: 'occupied', sku: 'SKU-8847', qty: 350 },
  { id: 'A-01-04', zone: 'A', status: 'empty', sku: null, qty: 0 },
  { id: 'A-01-05', zone: 'A', status: 'reserved', sku: null, qty: 0 },
  { id: 'A-02-01', zone: 'A', status: 'occupied', sku: 'SKU-5521', qty: 500 },
  { id: 'A-02-02', zone: 'A', status: 'empty', sku: null, qty: 0 },
  { id: 'A-02-03', zone: 'A', status: 'occupied', sku: 'SKU-9912', qty: 25 },
  { id: 'B-01-01', zone: 'B', status: 'occupied', sku: 'SKU-2234', qty: 320 },
  { id: 'B-01-02', zone: 'B', status: 'empty', sku: null, qty: 0 },
  { id: 'B-02-01', zone: 'B', status: 'occupied', sku: 'SKU-4456', qty: 1200 },
  { id: 'C-01-01', zone: 'C', status: 'occupied', sku: 'SKU-6678', qty: 890 },
  { id: 'C-03-02', zone: 'C', status: 'occupied', sku: 'SKU-5521', qty: 800 },
];

export default function WmsLocations() {
  const [selectedZone, setSelectedZone] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLocations = locationDetails.filter(loc => {
    const matchesSearch = loc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (loc.sku && loc.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesZone = !selectedZone || loc.zone === selectedZone;
    return matchesSearch && matchesZone;
  });

  const totalLocations = locationDetails.length;
  const occupiedLocations = locationDetails.filter(l => l.status === 'occupied').length;
  const emptyLocations = locationDetails.filter(l => l.status === 'empty').length;
  const reservedLocations = locationDetails.filter(l => l.status === 'reserved').length;

  return (
    <div className="space-y-6" data-testid="wms-locations">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ubicaciones</h1>
        <p className="text-slate-500">Gestión de espacios y layout del almacén</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Grid3X3 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{totalLocations}</p>
                <p className="text-xs text-slate-500">Total Ubicaciones</p>
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
                <p className="text-2xl font-bold text-emerald-600">{occupiedLocations}</p>
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
                <p className="text-2xl font-bold text-blue-600">{emptyLocations}</p>
                <p className="text-xs text-slate-500">Disponibles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <XCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{reservedLocations}</p>
                <p className="text-xs text-slate-500">Reservadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zones Grid */}
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
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-slate-800">Zona {zone.id}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    zone.ocupacion >= 80 ? 'bg-red-100 text-red-700' :
                    zone.ocupacion >= 60 ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {zone.ocupacion}% ocupado
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-2">{zone.name}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>{zone.rows} filas</span>
                  <span>{zone.cols} columnas</span>
                  <span>{zone.rows * zone.cols} ubicaciones</span>
                </div>
                {/* Progress bar */}
                <div className="mt-3 w-full bg-slate-200 rounded-full h-2">
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

      {/* Location Details */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg">
              Detalle de Ubicaciones {selectedZone && `- Zona ${selectedZone}`}
            </CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar ubicación o SKU..."
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
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((loc) => (
                  <tr key={loc.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm font-medium text-emerald-600">{loc.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-600">Zona {loc.zone}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        loc.status === 'occupied' ? 'bg-emerald-100 text-emerald-700' :
                        loc.status === 'empty' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {loc.status === 'occupied' ? 'Ocupada' : 
                         loc.status === 'empty' ? 'Disponible' : 'Reservada'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {loc.sku ? (
                        <span className="font-mono text-sm text-slate-600">{loc.sku}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {loc.qty > 0 ? loc.qty.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="w-4 h-4 text-slate-500" />
                      </Button>
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
