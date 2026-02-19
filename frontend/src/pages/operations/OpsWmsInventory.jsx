import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  Filter,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  Upload
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const inventoryData = [
  { id: 'SKU-8847', name: 'Producto A - Importación', category: 'Electrónicos', qty: 1500, minStock: 500, location: 'A-01-03', status: 'ok', lastMove: '2024-02-19', value: 45000 },
  { id: 'SKU-2234', name: 'Componente B - Automotriz', category: 'Automotriz', qty: 320, minStock: 400, location: 'B-02-01', status: 'low', lastMove: '2024-02-19', value: 12800 },
  { id: 'SKU-5521', name: 'Material C - Construcción', category: 'Construcción', qty: 2800, minStock: 1000, location: 'C-03-02', status: 'ok', lastMove: '2024-02-18', value: 84000 },
  { id: 'SKU-1102', name: 'Químico D - Industrial', category: 'Químicos', qty: 150, minStock: 200, location: 'A-02-05', status: 'critical', lastMove: '2024-02-19', value: 7500 },
  { id: 'SKU-7789', name: 'Textil E - Confección', category: 'Textiles', qty: 4500, minStock: 1500, location: 'D-01-01', status: 'ok', lastMove: '2024-02-17', value: 67500 },
  { id: 'SKU-3345', name: 'Alimento F - Perecedero', category: 'Alimentos', qty: 80, minStock: 300, location: 'E-01-02', status: 'critical', lastMove: '2024-02-19', value: 2400 },
  { id: 'SKU-9912', name: 'Maquinaria G - Pesada', category: 'Maquinaria', qty: 25, minStock: 10, location: 'F-01-01', status: 'ok', lastMove: '2024-02-15', value: 125000 },
  { id: 'SKU-4456', name: 'Plástico H - Reciclable', category: 'Plásticos', qty: 6200, minStock: 2000, location: 'G-02-03', status: 'ok', lastMove: '2024-02-18', value: 31000 },
];

const categories = ['Todos', 'Electrónicos', 'Automotriz', 'Construcción', 'Químicos', 'Textiles', 'Alimentos', 'Maquinaria', 'Plásticos'];

export default function OpsWmsInventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const filteredInventory = inventoryData.filter(item => {
    const matchesSearch = item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = {
    total: inventoryData.length,
    totalValue: inventoryData.reduce((sum, i) => sum + i.value, 0),
    ok: inventoryData.filter(i => i.status === 'ok').length,
    critical: inventoryData.filter(i => i.status === 'critical' || i.status === 'low').length,
  };

  return (
    <div className="space-y-6" data-testid="ops-wms-inventory">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">WMS - Inventario</h1>
          <p className="text-slate-500">Gestión de productos y existencias del almacén</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Importar
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Package className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                <p className="text-xs text-slate-500">Total SKUs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">${(stats.totalValue / 1000).toFixed(0)}K</p>
                <p className="text-xs text-slate-500">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.ok}</p>
                <p className="text-xs text-slate-500">Stock OK</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                <p className="text-xs text-slate-500">Requieren Atención</p>
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
                placeholder="Buscar por SKU o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.slice(0, 5).map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={selectedCategory === cat ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Lista de Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">SKU</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Producto</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Categoría</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Cantidad</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Valor</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Ubicación</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Estado</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm font-medium text-emerald-600">{item.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-800">{item.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {item.qty.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ${item.value.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-slate-600">{item.location}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.status === 'ok' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'low' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {item.status === 'ok' ? 'OK' : item.status === 'low' ? 'Bajo' : 'Crítico'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Trash2 className="w-4 h-4 text-slate-500" />
                        </Button>
                      </div>
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
