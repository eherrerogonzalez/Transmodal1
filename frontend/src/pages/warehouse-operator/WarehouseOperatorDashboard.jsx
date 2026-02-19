import React from 'react';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Package,
  MapPin,
  TrendingUp,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';

const stats = [
  { label: 'Tareas Pendientes', value: '8', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  { label: 'Completadas Hoy', value: '12', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { label: 'Urgentes', value: '2', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  { label: 'Rendimiento', value: '94%', icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-100' },
];

const pendingTasks = [
  { id: 'TASK-001', type: 'picking', priority: 'urgent', order: 'ORD-2847', items: 5, location: 'Zona A', deadline: '11:00' },
  { id: 'TASK-002', type: 'putaway', priority: 'high', container: 'MSKU884762', items: 150, location: 'Zona B', deadline: '12:30' },
  { id: 'TASK-003', type: 'picking', priority: 'normal', order: 'ORD-2848', items: 3, location: 'Zona C', deadline: '14:00' },
  { id: 'TASK-004', type: 'transfer', priority: 'normal', sku: 'SKU-5521', qty: 200, from: 'C-01-02', to: 'C-03-02', deadline: '15:00' },
];

const recentActivity = [
  { action: 'Picking completado', order: 'ORD-2845', time: '10:45', items: 8 },
  { action: 'Ubicación completada', container: 'MSKU884761', time: '10:20', items: 120 },
  { action: 'Picking completado', order: 'ORD-2844', time: '09:55', items: 4 },
  { action: 'Traslado completado', sku: 'SKU-3345', time: '09:30', qty: 50 },
];

export default function WarehouseOperatorDashboard() {
  const navigate = useNavigate();

  const getTaskTypeLabel = (type) => {
    switch(type) {
      case 'picking': return 'Picking';
      case 'putaway': return 'Ubicación';
      case 'transfer': return 'Traslado';
      default: return type;
    }
  };

  const getTaskTypeIcon = (type) => {
    switch(type) {
      case 'picking': return <Package className="w-4 h-4" />;
      case 'putaway': return <MapPin className="w-4 h-4" />;
      case 'transfer': return <TrendingUp className="w-4 h-4" />;
      default: return <ClipboardList className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6" data-testid="warehouse-op-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mi Dashboard</h1>
          <p className="text-slate-500">Bienvenido, aquí están tus tareas del día</p>
        </div>
        <Button 
          className="bg-violet-600 hover:bg-violet-700"
          onClick={() => navigate('/warehouse-op/tasks')}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Ver Todas las Tareas
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <Card className="lg:col-span-2 bg-white border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-600" />
              Tareas Pendientes
            </CardTitle>
            <span className="text-sm text-slate-500">{pendingTasks.length} tareas</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`p-4 rounded-lg border-2 ${
                    task.priority === 'urgent' ? 'border-red-200 bg-red-50' : 
                    task.priority === 'high' ? 'border-amber-200 bg-amber-50' : 
                    'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        task.type === 'picking' ? 'bg-blue-100 text-blue-600' :
                        task.type === 'putaway' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {getTaskTypeIcon(task.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{task.id}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority === 'urgent' ? 'URGENTE' : task.priority === 'high' ? 'ALTA' : 'NORMAL'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{getTaskTypeLabel(task.type)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-800">Antes de {task.deadline}</p>
                      <p className="text-xs text-slate-500">{task.location || `${task.from} → ${task.to}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                      {task.order && <span>Orden: <strong>{task.order}</strong></span>}
                      {task.container && <span>Contenedor: <strong>{task.container}</strong></span>}
                      {task.sku && <span>SKU: <strong>{task.sku}</strong></span>}
                      {task.items && <span className="ml-3">{task.items} artículos</span>}
                      {task.qty && <span className="ml-3">{task.qty} unidades</span>}
                    </div>
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                      Iniciar Tarea
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{activity.action}</p>
                    <p className="text-xs text-slate-500">
                      {activity.order && `Orden ${activity.order}`}
                      {activity.container && `Contenedor ${activity.container}`}
                      {activity.sku && `SKU ${activity.sku}`}
                      {activity.items && ` • ${activity.items} artículos`}
                      {activity.qty && ` • ${activity.qty} unidades`}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-violet-500 to-violet-700 text-white border-0">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold mb-1">¿Listo para comenzar?</h3>
              <p className="text-violet-200">Selecciona una acción rápida para iniciar tu siguiente tarea</p>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                <Package className="w-4 h-4 mr-2" />
                Iniciar Picking
              </Button>
              <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                <MapPin className="w-4 h-4 mr-2" />
                Iniciar Ubicación
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
