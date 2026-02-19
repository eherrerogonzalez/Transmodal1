import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Calendar,
  User,
  Package
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const movementsData = [
  { id: 'MOV-001', type: 'entrada', sku: 'SKU-8847', product: 'Producto A - Importación', qty: 150, from: 'Recepción', to: 'A-01-03', user: 'Juan Pérez', date: '2024-02-19 10:45', status: 'completed' },
  { id: 'MOV-002', type: 'salida', sku: 'SKU-2234', product: 'Componente B - Automotriz', qty: 80, from: 'B-02-01', to: 'Embarque', user: 'Carlos López', date: '2024-02-19 10:32', status: 'completed' },
  { id: 'MOV-003', type: 'traslado', sku: 'SKU-5521', product: 'Material C - Construcción', qty: 200, from: 'C-01-02', to: 'C-03-02', user: 'Miguel Torres', date: '2024-02-19 10:15', status: 'completed' },
  { id: 'MOV-004', type: 'entrada', sku: 'SKU-1102', product: 'Químico D - Industrial', qty: 500, from: 'Recepción', to: 'A-02-05', user: 'Roberto Díaz', date: '2024-02-19 09:58', status: 'completed' },
  { id: 'MOV-005', type: 'salida', sku: 'SKU-7789', product: 'Textil E - Confección', qty: 120, from: 'D-01-01', to: 'Embarque', user: 'Ana García', date: '2024-02-19 09:45', status: 'completed' },
  { id: 'MOV-006', type: 'traslado', sku: 'SKU-3345', product: 'Alimento F - Perecedero', qty: 50, from: 'E-01-01', to: 'E-01-02', user: 'Luis Martínez', date: '2024-02-19 09:30', status: 'in_progress' },
  { id: 'MOV-007', type: 'entrada', sku: 'SKU-9912', product: 'Maquinaria G - Pesada', qty: 5, from: 'Recepción', to: 'F-01-01', user: 'Pedro Sánchez', date: '2024-02-19 09:15', status: 'pending' },
  { id: 'MOV-008', type: 'salida', sku: 'SKU-4456', product: 'Plástico H - Reciclable', qty: 1000, from: 'G-02-03', to: 'Embarque', user: 'María López', date: '2024-02-19 09:00', status: 'completed' },
];

const movementTypes = ['Todos', 'Entrada', 'Salida', 'Traslado'];

export default function WmsMovements() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('Todos');

  const filteredMovements = movementsData.filter(mov => {
    const matchesSearch = mov.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mov.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mov.product.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'Todos' || mov.type === selectedType.toLowerCase();
    return matchesSearch && matchesType;
  });

  const stats = {
    total: movementsData.length,
    entradas: movementsData.filter(m => m.type === 'entrada').length,
    salidas: movementsData.filter(m => m.type === 'salida').length,
    traslados: movementsData.filter(m => m.type === 'traslado').length,
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'entrada': return <ArrowRight className="w-4 h-4" />;
      case 'salida': return <ArrowLeft className="w-4 h-4" />;
      case 'traslado': return <RefreshCw className="w-4 h-4" />;
      default: return <ArrowLeftRight className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'entrada': return 'bg-emerald-100 text-emerald-700';
      case 'salida': return 'bg-red-100 text-red-700';
      case 'traslado': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6" data-testid="wms-movements">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Movimientos</h1>
          <p className="text-slate-500">Historial de entradas, salidas y traslados</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <ArrowLeftRight className="w-4 h-4 mr-2" />
          Nuevo Movimiento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <ArrowLeftRight className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500">Total Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ArrowRight className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.entradas}</p>
                <p className="text-xs text-slate-500">Entradas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.salidas}</p>
                <p className="text-xs text-slate-500">Salidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.traslados}</p>
                <p className="text-xs text-slate-500">Traslados</p>
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
                placeholder="Buscar por ID, SKU o producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {movementTypes.map(type => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className={selectedType === type ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements List */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Historial de Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredMovements.map((mov) => (
              <div key={mov.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${getTypeColor(mov.type)}`}>
                      {getTypeIcon(mov.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium text-slate-800">{mov.id}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getTypeColor(mov.type)}`}>
                          {mov.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          mov.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          mov.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {mov.status === 'completed' ? 'Completado' : 
                           mov.status === 'in_progress' ? 'En Proceso' : 'Pendiente'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-3 h-3 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          <span className="font-mono text-emerald-600">{mov.sku}</span> - {mov.product}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {mov.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {mov.user}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Cantidad</p>
                      <p className="text-lg font-bold text-slate-800">{mov.qty.toLocaleString()}</p>
                    </div>
                    <div className="text-center min-w-[120px]">
                      <p className="text-xs text-slate-500 mb-1">Movimiento</p>
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="font-mono text-slate-600">{mov.from}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-500" />
                        <span className="font-mono text-slate-600">{mov.to}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredMovements.length === 0 && (
            <div className="text-center py-12">
              <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No se encontraron movimientos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
