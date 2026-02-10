import React, { useState, useEffect } from 'react';
import { getPlanningForecast } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
  Package, 
  DollarSign, 
  Calendar,
  Warehouse,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  BarChart3,
  Settings,
  Truck,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatNumber = (value) => {
  return new Intl.NumberFormat('es-MX').format(value);
};

const KPICard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    slate: 'bg-slate-100 text-slate-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <Card className="border-slate-200 rounded-sm shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wider font-medium">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2 tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span className="text-sm font-medium">{trendValue}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-sm ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const Planning = () => {
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState(null);
  const [warehouseDoors, setWarehouseDoors] = useState(8);
  const [tempDoors, setTempDoors] = useState('8');

  useEffect(() => {
    fetchForecast();
  }, [warehouseDoors]);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const response = await getPlanningForecast(warehouseDoors);
      setForecast(response.data);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      toast.error('Error al cargar el pronóstico');
    } finally {
      setLoading(false);
    }
  };

  const handleDoorsChange = () => {
    const doors = parseInt(tempDoors);
    if (doors >= 1 && doors <= 50) {
      setWarehouseDoors(doors);
      toast.success(`Capacidad actualizada a ${doors} puertas`);
    } else {
      toast.error('Ingrese un número entre 1 y 50');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  const { historical_summary, annual_forecast, monthly_forecast, delivery_calendar, budget_comparison } = forecast || {};

  // Prepare chart data
  const monthlyChartData = monthly_forecast?.map(m => ({
    month: m.month,
    contenedores: m.forecasted_containers,
    costoLogistico: m.forecasted_logistics_cost,
    costosExtra: m.forecasted_extra_costs,
    confianza: m.confidence_level * 100
  })) || [];

  // Budget comparison data
  const comparisonData = budget_comparison ? [
    {
      name: `${budget_comparison.previous_year.year} (Real)`,
      contenedores: budget_comparison.previous_year.containers,
      costoTotal: budget_comparison.previous_year.total,
      costoLogistico: budget_comparison.previous_year.logistics_cost,
      costosExtra: budget_comparison.previous_year.extra_costs
    },
    {
      name: `${budget_comparison.forecast.year} (Pronóstico)`,
      contenedores: budget_comparison.forecast.containers,
      costoTotal: budget_comparison.forecast.total,
      costoLogistico: budget_comparison.forecast.logistics_cost,
      costosExtra: budget_comparison.forecast.extra_costs
    }
  ] : [];

  return (
    <div className="space-y-6" data-testid="planning-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Planeación Logística</h1>
          <p className="text-slate-500 mt-1">
            Pronóstico {forecast?.year} basado en histórico de {historical_summary?.years_analyzed} años
          </p>
        </div>
        
        {/* Warehouse Configuration */}
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-slate-400" />
                <Label className="text-sm font-medium text-slate-700">Puertas de Almacén:</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={tempDoors}
                  onChange={(e) => setTempDoors(e.target.value)}
                  className="w-20 h-9 rounded-sm"
                  min="1"
                  max="50"
                  data-testid="warehouse-doors-input"
                />
                <Button 
                  onClick={handleDoorsChange}
                  size="sm"
                  className="rounded-sm bg-slate-900 hover:bg-slate-800"
                  data-testid="update-capacity-btn"
                >
                  Actualizar
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Capacidad máxima: {warehouseDoors} contenedores/día
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Contenedores Pronóstico"
          value={formatNumber(annual_forecast?.forecasted_containers || 0)}
          subtitle={`${formatNumber(annual_forecast?.avg_monthly_containers || 0)} promedio/mes`}
          icon={Package}
          color="blue"
          trend={budget_comparison?.variance?.containers_percent > 0 ? 'up' : 'down'}
          trendValue={`${budget_comparison?.variance?.containers_percent || 0}% vs año anterior`}
        />
        <KPICard
          title="Presupuesto Logístico"
          value={formatCurrency(annual_forecast?.forecasted_logistics_cost || 0)}
          subtitle="Costo base estimado"
          icon={DollarSign}
          color="slate"
        />
        <KPICard
          title="Costos Extras Estimados"
          value={formatCurrency(annual_forecast?.forecasted_extra_costs || 0)}
          subtitle={`${historical_summary?.extra_cost_ratio_percent || 0}% del costo base`}
          icon={AlertTriangle}
          color="orange"
        />
        <KPICard
          title="Presupuesto Total"
          value={formatCurrency(annual_forecast?.total_forecasted_budget || 0)}
          subtitle="Logística + Extras"
          icon={Calculator}
          color="purple"
          trend={budget_comparison?.variance?.cost_percent > 0 ? 'up' : 'down'}
          trendValue={`${budget_comparison?.variance?.cost_percent || 0}% vs año anterior`}
        />
      </div>

      {/* Capacity Warning */}
      {annual_forecast?.warehouse_capacity?.utilization_forecast_percent > 85 && (
        <Card className="border-amber-200 bg-amber-50 rounded-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-800">Alerta de Capacidad</p>
              <p className="text-sm text-amber-700">
                La utilización proyectada ({annual_forecast?.warehouse_capacity?.utilization_forecast_percent}%) 
                supera el 85% de capacidad. Considere aumentar puertas de descarga o ajustar días de operación.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="forecast" className="space-y-6">
        <TabsList className="bg-slate-100 rounded-sm">
          <TabsTrigger value="forecast" className="rounded-sm data-[state=active]:bg-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            Pronóstico Mensual
          </TabsTrigger>
          <TabsTrigger value="comparison" className="rounded-sm data-[state=active]:bg-white">
            <TrendingUp className="w-4 h-4 mr-2" />
            Comparativo
          </TabsTrigger>
          <TabsTrigger value="calendar" className="rounded-sm data-[state=active]:bg-white">
            <Calendar className="w-4 h-4 mr-2" />
            Calendario Entregas
          </TabsTrigger>
          <TabsTrigger value="capacity" className="rounded-sm data-[state=active]:bg-white">
            <Warehouse className="w-4 h-4 mr-2" />
            Capacidad
          </TabsTrigger>
        </TabsList>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Containers Forecast Chart */}
            <Card className="border-slate-200 rounded-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Contenedores por Mes (Pronóstico {forecast?.year})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyChartData}>
                      <defs>
                        <linearGradient id="colorContainers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '4px' }}
                        formatter={(value, name) => [
                          name === 'confianza' ? `${value}%` : formatNumber(value),
                          name === 'contenedores' ? 'Contenedores' : 'Confianza'
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="contenedores"
                        stroke="#2563EB"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorContainers)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="confianza" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        yAxisId="right"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Costs Forecast Chart */}
            <Card className="border-slate-200 rounded-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-slate-600" />
                  Costos por Mes (Pronóstico {forecast?.year})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#64748B' }}
                        tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '4px' }}
                        formatter={(value) => [formatCurrency(value)]}
                      />
                      <Legend />
                      <Bar dataKey="costoLogistico" name="Costo Logístico" fill="#0F172A" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="costosExtra" name="Costos Extra" fill="#F97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Detail Table */}
          <Card className="border-slate-200 rounded-sm shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Detalle Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Mes</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Contenedores</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Costo Logístico</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Costos Extra</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Total</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Confianza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly_forecast?.map((m, idx) => (
                      <tr key={m.month} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">{m.month}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{formatNumber(m.forecasted_containers)}</td>
                        <td className="py-3 px-4 text-right text-slate-700">{formatCurrency(m.forecasted_logistics_cost)}</td>
                        <td className="py-3 px-4 text-right text-orange-600">{formatCurrency(m.forecasted_extra_costs)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">
                          {formatCurrency(m.forecasted_logistics_cost + m.forecasted_extra_costs)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge 
                            variant="outline" 
                            className={`rounded-sm ${
                              m.confidence_level >= 0.85 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : m.confidence_level >= 0.75 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {Math.round(m.confidence_level * 100)}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 font-bold">
                      <td className="py-3 px-4 text-slate-900">TOTAL ANUAL</td>
                      <td className="py-3 px-4 text-right text-slate-900">
                        {formatNumber(annual_forecast?.forecasted_containers || 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900">
                        {formatCurrency(annual_forecast?.forecasted_logistics_cost || 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-orange-600">
                        {formatCurrency(annual_forecast?.forecasted_extra_costs || 0)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900">
                        {formatCurrency(annual_forecast?.total_forecasted_budget || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparison" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Previous Year Card */}
            <Card className="border-slate-200 rounded-sm shadow-sm">
              <CardHeader className="bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-500" />
                  {budget_comparison?.previous_year?.year} (Real)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Contenedores</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatNumber(budget_comparison?.previous_year?.containers || 0)}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Costo Logístico</p>
                  <p className="text-xl font-semibold text-slate-700">
                    {formatCurrency(budget_comparison?.previous_year?.logistics_cost || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Costos Extra</p>
                  <p className="text-xl font-semibold text-orange-600">
                    {formatCurrency(budget_comparison?.previous_year?.extra_costs || 0)}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Total</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {formatCurrency(budget_comparison?.previous_year?.total || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Variance Card */}
            <Card className="border-blue-200 bg-blue-50 rounded-sm shadow-sm">
              <CardHeader className="bg-blue-100 border-b border-blue-200">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-blue-800">
                  <TrendingUp className="w-5 h-5" />
                  Variación
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-blue-600 uppercase tracking-wider">Contenedores</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${budget_comparison?.variance?.containers_diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {budget_comparison?.variance?.containers_diff >= 0 ? '+' : ''}{formatNumber(budget_comparison?.variance?.containers_diff || 0)}
                    </p>
                    <Badge className={`${budget_comparison?.variance?.containers_percent >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {budget_comparison?.variance?.containers_percent >= 0 ? '+' : ''}{budget_comparison?.variance?.containers_percent}%
                    </Badge>
                  </div>
                </div>
                <Separator className="bg-blue-200" />
                <div>
                  <p className="text-sm text-blue-600 uppercase tracking-wider">Costo Total</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${budget_comparison?.variance?.cost_diff >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {budget_comparison?.variance?.cost_diff >= 0 ? '+' : ''}{formatCurrency(budget_comparison?.variance?.cost_diff || 0)}
                    </p>
                    <Badge className={`${budget_comparison?.variance?.cost_percent >= 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {budget_comparison?.variance?.cost_percent >= 0 ? '+' : ''}{budget_comparison?.variance?.cost_percent}%
                    </Badge>
                  </div>
                </div>
                <Separator className="bg-blue-200" />
                <div className="pt-2">
                  <p className="text-sm text-blue-700">
                    <strong>Análisis:</strong> Se proyecta un {budget_comparison?.variance?.containers_percent >= 0 ? 'incremento' : 'decremento'} del {Math.abs(budget_comparison?.variance?.containers_percent || 0)}% en volumen con un {budget_comparison?.variance?.cost_percent >= 0 ? 'aumento' : 'ahorro'} del {Math.abs(budget_comparison?.variance?.cost_percent || 0)}% en costos.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Forecast Card */}
            <Card className="border-emerald-200 rounded-sm shadow-sm">
              <CardHeader className="bg-emerald-50 border-b border-emerald-200">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-emerald-800">
                  <Target className="w-5 h-5" />
                  {budget_comparison?.forecast?.year} (Pronóstico)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Contenedores</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatNumber(budget_comparison?.forecast?.containers || 0)}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Costo Logístico</p>
                  <p className="text-xl font-semibold text-slate-700">
                    {formatCurrency(budget_comparison?.forecast?.logistics_cost || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Costos Extra</p>
                  <p className="text-xl font-semibold text-orange-600">
                    {formatCurrency(budget_comparison?.forecast?.extra_costs || 0)}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider">Total Presupuesto</p>
                  <p className="text-3xl font-bold text-emerald-700">
                    {formatCurrency(budget_comparison?.forecast?.total || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparison Chart */}
          <Card className="border-slate-200 rounded-sm shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Comparativo Visual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis 
                      type="number"
                      tickFormatter={(value) => `$${(value/1000000).toFixed(1)}M`}
                    />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip 
                      formatter={(value) => [formatCurrency(value)]}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '4px' }}
                    />
                    <Legend />
                    <Bar dataKey="costoLogistico" name="Costo Logístico" fill="#0F172A" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="costosExtra" name="Costos Extra" fill="#F97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card className="border-slate-200 rounded-sm shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Calendario de Entregas (Próximos 30 días)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {delivery_calendar?.map((day, idx) => (
                    <div 
                      key={day.date}
                      className={`p-4 rounded-sm border transition-all ${
                        day.utilization_percent >= 100 
                          ? 'border-red-200 bg-red-50' 
                          : day.utilization_percent >= 80 
                            ? 'border-amber-200 bg-amber-50'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-slate-900">
                              {new Date(day.date).getDate()}
                            </p>
                            <p className="text-xs text-slate-500 uppercase">
                              {new Date(day.date).toLocaleDateString('es-MX', { month: 'short' })}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{day.day_name}</p>
                            <p className="text-sm text-slate-500">
                              {day.scheduled_containers} de {day.max_capacity} contenedores
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge 
                            className={`rounded-sm ${
                              day.utilization_percent >= 100 
                                ? 'bg-red-100 text-red-700' 
                                : day.utilization_percent >= 80 
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {day.utilization_percent}% capacidad
                          </Badge>
                          {day.utilization_percent >= 100 && (
                            <p className="text-xs text-red-600 mt-1">⚠️ Sobre capacidad</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Capacity Bar */}
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            day.utilization_percent >= 100 
                              ? 'bg-red-500' 
                              : day.utilization_percent >= 80 
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(day.utilization_percent, 100)}%` }}
                        />
                      </div>

                      {/* Container List Preview */}
                      {day.containers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {day.containers.slice(0, 6).map((c, cidx) => (
                            <Badge key={cidx} variant="outline" className="rounded-sm text-xs font-mono">
                              {c.container_number} - {c.eta}
                            </Badge>
                          ))}
                          {day.containers.length > 6 && (
                            <Badge variant="outline" className="rounded-sm text-xs">
                              +{day.containers.length - 6} más
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capacity Tab */}
        <TabsContent value="capacity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Capacity Configuration */}
            <Card className="border-slate-200 rounded-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-600" />
                  Configuración de Capacidad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-slate-50 rounded-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Puertas de descarga</span>
                    <span className="text-xl font-bold text-slate-900">{warehouseDoors}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Capacidad diaria máxima</span>
                    <span className="text-xl font-bold text-slate-900">{annual_forecast?.warehouse_capacity?.daily_capacity} contenedores</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Capacidad mensual (~22 días)</span>
                    <span className="text-xl font-bold text-slate-900">{annual_forecast?.warehouse_capacity?.monthly_capacity} contenedores</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Capacidad anual</span>
                    <span className="text-xl font-bold text-slate-900">{formatNumber(annual_forecast?.warehouse_capacity?.annual_capacity || 0)} contenedores</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Utilización Proyectada</h4>
                  <div className="p-4 bg-slate-50 rounded-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-600">Pronóstico anual</span>
                      <span className="font-bold">{formatNumber(annual_forecast?.forecasted_containers || 0)} contenedores</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-slate-600">% de utilización</span>
                      <Badge className={`${
                        annual_forecast?.warehouse_capacity?.utilization_forecast_percent >= 90 
                          ? 'bg-red-100 text-red-700' 
                          : annual_forecast?.warehouse_capacity?.utilization_forecast_percent >= 75
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {annual_forecast?.warehouse_capacity?.utilization_forecast_percent}%
                      </Badge>
                    </div>
                    <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          annual_forecast?.warehouse_capacity?.utilization_forecast_percent >= 90 
                            ? 'bg-red-500' 
                            : annual_forecast?.warehouse_capacity?.utilization_forecast_percent >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(annual_forecast?.warehouse_capacity?.utilization_forecast_percent || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="border-slate-200 rounded-sm shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  Recomendaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {annual_forecast?.warehouse_capacity?.utilization_forecast_percent >= 90 && (
                  <div className="p-4 border border-red-200 bg-red-50 rounded-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-800">Capacidad Crítica</p>
                        <p className="text-sm text-red-700 mt-1">
                          Se recomienda aumentar a {Math.ceil((annual_forecast?.forecasted_containers || 0) / (22 * 12) * 1.15)} puertas 
                          para mantener un margen de seguridad del 15%.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {annual_forecast?.warehouse_capacity?.utilization_forecast_percent >= 75 && annual_forecast?.warehouse_capacity?.utilization_forecast_percent < 90 && (
                  <div className="p-4 border border-amber-200 bg-amber-50 rounded-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-800">Capacidad Alta</p>
                        <p className="text-sm text-amber-700 mt-1">
                          Considere habilitar operaciones en sábado o aumentar turnos para absorber picos de demanda.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {annual_forecast?.warehouse_capacity?.utilization_forecast_percent < 75 && (
                  <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-sm">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-emerald-800">Capacidad Adecuada</p>
                        <p className="text-sm text-emerald-700 mt-1">
                          La configuración actual es suficiente para el pronóstico. Hay margen para absorber variaciones.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 border border-slate-200 bg-slate-50 rounded-sm">
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-slate-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">Costo por Contenedor</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Promedio histórico: <strong>{formatCurrency(historical_summary?.avg_cost_per_container || 0)}</strong> por contenedor.
                        Los costos extra representan aproximadamente el <strong>{historical_summary?.extra_cost_ratio_percent}%</strong> del costo base.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 bg-slate-50 rounded-sm">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-800">Tendencia de Crecimiento</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Basado en el histórico, se detecta un crecimiento anual del <strong>{historical_summary?.growth_rate_percent}%</strong> en volumen de contenedores.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Planning;
