import React from 'react';
import { 
  Fuel, 
  Truck,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const fuelData = [
  { id: 'CARGA-001', unit: 'T-2847', driver: 'Juan Pérez', liters: 450, cost: 11250, station: 'Pemex Veracruz', date: '2024-02-19 08:30', km: 125840 },
  { id: 'CARGA-002', unit: 'T-1923', driver: 'Carlos López', liters: 380, cost: 9500, station: 'BP Manzanillo', date: '2024-02-19 07:15', km: 98450 },
  { id: 'CARGA-003', unit: 'T-3102', driver: 'Miguel Torres', liters: 420, cost: 10500, station: 'Shell CDMX', date: '2024-02-18 18:45', km: 156230 },
  { id: 'CARGA-004', unit: 'T-5678', driver: 'Roberto Díaz', liters: 280, cost: 7000, station: 'Pemex Guadalajara', date: '2024-02-18 14:20', km: 78920 },
];

const stats = {
  totalLiters: 1530,
  totalCost: 38250,
  avgConsumption: 3.2,
  monthlyBudget: 150000,
  spent: 89000,
};

export default function OpsTmsFuel() {
  return (
    <div className="space-y-6" data-testid="ops-tms-fuel">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">TMS - Combustible</h1>
        <p className="text-slate-500">Control de cargas y consumo de combustible</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Fuel className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.totalLiters.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Litros Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">${(stats.totalCost / 1000).toFixed(1)}K</p>
                <p className="text-xs text-slate-500">Gasto Hoy</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingDown className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.avgConsumption}</p>
                <p className="text-xs text-slate-500">km/litro prom.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{Math.round(stats.spent / stats.monthlyBudget * 100)}%</p>
                <p className="text-xs text-slate-500">Presupuesto Usado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget progress */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-slate-700">Presupuesto Mensual de Combustible</span>
            <span className="text-sm text-slate-500">
              ${stats.spent.toLocaleString()} / ${stats.monthlyBudget.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full ${
                stats.spent / stats.monthlyBudget > 0.9 ? 'bg-red-500' :
                stats.spent / stats.monthlyBudget > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(stats.spent / stats.monthlyBudget * 100, 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent fuel loads */}
      <Card className="bg-white border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Cargas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Unidad</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Operador</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Litros</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Costo</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Estación</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Fecha</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Odómetro</th>
                </tr>
              </thead>
              <tbody>
                {fuelData.map((load) => (
                  <tr key={load.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <span className="font-mono text-sm text-slate-600">{load.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-600" />
                        <span className="font-medium">{load.unit}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{load.driver}</td>
                    <td className="py-3 px-4 text-right font-medium">{load.liters} L</td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-600">${load.cost.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-600">{load.station}</td>
                    <td className="py-3 px-4 text-sm text-slate-500">{load.date}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{load.km.toLocaleString()} km</td>
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
