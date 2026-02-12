import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users,
  Map,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import api from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function OpsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await api.get('/ops/dashboard/profitability');
      setData(response.data);
    } catch (error) {
      toast.error('Error al cargar dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="space-y-6" data-testid="ops-dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard de Rentabilidad</h1>
          <p className="text-slate-500">Período: {data?.period_start} - {data?.period_end}</p>
        </div>
        <Button onClick={loadDashboard} variant="outline" className="border-slate-300">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Ingresos Totales</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(data?.total_revenue)}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Costos Totales</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(data?.total_costs)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Utilidad</p>
                <p className={`text-2xl font-bold ${data?.total_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(data?.total_profit)}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${data?.total_profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <TrendingUp className={`w-6 h-6 ${data?.total_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Margen</p>
                <p className={`text-2xl font-bold ${data?.margin_percent >= 10 ? 'text-emerald-600' : data?.margin_percent >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                  {data?.margin_percent}%
                </p>
                <p className="text-xs text-slate-400">{data?.containers_count} contenedores</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Tendencia Mensual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Ingresos" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                  <Line type="monotone" dataKey="costs" name="Costos" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                  <Line type="monotone" dataKey="profit" name="Utilidad" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Client */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Rentabilidad por Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.by_client?.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis dataKey="client" type="category" stroke="#64748b" fontSize={11} width={100} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="profit" name="Utilidad" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Profitable */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Más Rentables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.top_profitable?.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <div>
                    <p className="font-mono font-medium text-slate-800">{item.container}</p>
                    <p className="text-sm text-slate-500">{item.client}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{item.margin}%</p>
                    <p className="text-sm text-slate-500">{formatCurrency(item.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Least Profitable */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              Menos Rentables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.least_profitable?.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-mono font-medium text-slate-800">{item.container}</p>
                    <p className="text-sm text-slate-500">{item.client}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${item.margin >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{item.margin}%</p>
                    <p className="text-sm text-slate-500">{formatCurrency(item.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Route */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <Map className="w-5 h-5 text-blue-500" />
            Rentabilidad por Ruta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Ruta</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Contenedores</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Ingresos</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Costos</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Utilidad</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">Margen</th>
                </tr>
              </thead>
              <tbody>
                {data?.by_route?.slice(0, 8).map((route, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-700">{route.route}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-right">{route.containers}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-right">{formatCurrency(route.revenue)}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 text-right">{formatCurrency(route.costs)}</td>
                    <td className={`py-3 px-4 text-sm font-medium text-right ${route.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(route.profit)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        route.margin >= 15 ? 'bg-emerald-100 text-emerald-700' :
                        route.margin >= 8 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {route.margin}%
                      </span>
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
