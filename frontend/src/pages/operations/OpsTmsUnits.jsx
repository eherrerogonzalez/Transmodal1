import React, { useState } from 'react';
import { 
  Truck, 
  Search,
  Plus,
  Edit,
  MapPin,
  Fuel,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const unitsData = [
  { id: 'T-2847', plate: 'ABC-123', type: 'Tractocamión', brand: 'Kenworth', model: 'T680', year: 2022, status: 'active', driver: 'Juan Pérez', location: 'En ruta - Veracruz', fuel: 75, nextService: '2024-03-15' },
  { id: 'T-1923', plate: 'DEF-456', type: 'Tractocamión', brand: 'Freightliner', model: 'Cascadia', year: 2021, status: 'active', driver: 'Carlos López', location: 'En ruta - Manzanillo', fuel: 45, nextService: '2024-02-28' },
  { id: 'T-3102', plate: 'GHI-789', type: 'Tractocamión', brand: 'International', model: 'LT', year: 2023, status: 'active', driver: 'Miguel Torres', location: 'En ruta - Lázaro Cárdenas', fuel: 60, nextService: '2024-04-10' },
  { id: 'T-4521', plate: 'JKL-012', type: 'Tractocamión', brand: 'Kenworth', model: 'T880', year: 2020, status: 'maintenance', driver: null, location: 'Taller CDMX', fuel: 30, nextService: '2024-02-20' },
  { id: 'T-5678', plate: 'MNO-345', type: 'Rabón', brand: 'Hino', model: '500', year: 2022, status: 'active', driver: 'Roberto Díaz', location: 'Terminal CDMX', fuel: 90, nextService: '2024-03-22' },
  { id: 'T-6789', plate: 'PQR-678', type: 'Torton', brand: 'Isuzu', model: 'FTR', year: 2021, status: 'inactive', driver: null, location: 'Patio Guadalajara', fuel: 15, nextService: '2024-02-25' },
  { id: 'R-1001', plate: 'STU-901', type: 'Remolque', brand: 'Utility', model: 'Dry Van', year: 2022, status: 'active', driver: null, location: 'Acoplado a T-2847', fuel: null, nextService: '2024-05-01' },
  { id: 'R-1002', plate: 'VWX-234', type: 'Remolque', brand: 'Wabash', model: 'Refrigerado', year: 2023, status: 'active', driver: null, location: 'Terminal Veracruz', fuel: null, nextService: '2024-04-15' },
];

const unitTypes = ['Todos', 'Tractocamión', 'Rabón', 'Torton', 'Remolque'];
const statusFilters = ['Todos', 'Activos', 'En Mantenimiento', 'Inactivos'];

export default function OpsTmsUnits() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  const filteredUnits = unitsData.filter(unit => {
    const matchesSearch = unit.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         unit.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (unit.driver && unit.driver.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'Todos' || unit.type === selectedType;
    const matchesStatus = selectedStatus === 'Todos' ||
                         (selectedStatus === 'Activos' && unit.status === 'active') ||
                         (selectedStatus === 'En Mantenimiento' && unit.status === 'maintenance') ||
                         (selectedStatus === 'Inactivos' && unit.status === 'inactive');
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: unitsData.length,
    active: unitsData.filter(u => u.status === 'active').length,
    maintenance: unitsData.filter(u => u.status === 'maintenance').length,
    inactive: unitsData.filter(u => u.status === 'inactive').length,
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-emerald-100 text-emerald-700';
      case 'maintenance': return 'bg-amber-100 text-amber-700';
      case 'inactive': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'active': return 'Activo';
      case 'maintenance': return 'En Mantenimiento';
      case 'inactive': return 'Inactivo';
      default: return status;
    }
  };

  return (
    <div className="space-y-6" data-testid="ops-tms-units">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">TMS - Unidades</h1>
          <p className="text-slate-500">Gestión de flota y vehículos</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Unidad
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Truck className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Unidades</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
                <p className="text-xs text-slate-500">Activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.maintenance}</p>
                <p className="text-xs text-slate-500">Mantenimiento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                <p className="text-xs text-slate-500">Inactivos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por ID, placa u operador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {unitTypes.map(type => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className={selectedType === type ? "bg-amber-600 hover:bg-amber-700" : ""}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {statusFilters.map(status => (
              <Button
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(status)}
                className={selectedStatus === status ? "bg-slate-800 hover:bg-slate-900" : ""}
              >
                {status}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Units Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUnits.map((unit) => (
          <Card key={unit.id} className="bg-white border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    unit.type === 'Remolque' ? 'bg-purple-100' : 'bg-amber-100'
                  }`}>
                    <Truck className={`w-5 h-5 ${
                      unit.type === 'Remolque' ? 'text-purple-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{unit.id}</p>
                    <p className="text-sm text-slate-500">{unit.plate}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(unit.status)}`}>
                  {getStatusLabel(unit.status)}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipo:</span>
                  <span className="font-medium text-slate-700">{unit.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Marca/Modelo:</span>
                  <span className="font-medium text-slate-700">{unit.brand} {unit.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Año:</span>
                  <span className="font-medium text-slate-700">{unit.year}</span>
                </div>
                {unit.driver && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operador:</span>
                    <span className="font-medium text-slate-700">{unit.driver}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-slate-600 pt-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs">{unit.location}</span>
                </div>
              </div>

              {unit.fuel !== null && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Fuel className="w-3 h-3" /> Combustible
                    </span>
                    <span className={`font-medium ${
                      unit.fuel > 50 ? 'text-emerald-600' : unit.fuel > 25 ? 'text-amber-600' : 'text-red-600'
                    }`}>{unit.fuel}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        unit.fuel > 50 ? 'bg-emerald-500' : unit.fuel > 25 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${unit.fuel}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                <Button variant="outline" size="sm" className="flex-1">
                  <MapPin className="w-4 h-4 mr-1" />
                  Rastrear
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
