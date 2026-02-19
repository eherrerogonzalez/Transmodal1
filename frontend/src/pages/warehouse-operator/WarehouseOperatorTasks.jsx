import React, { useState } from 'react';
import { 
  ClipboardList, 
  Search, 
  Filter,
  Package,
  MapPin,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const allTasks = [
  { id: 'TASK-001', type: 'picking', priority: 'urgent', status: 'pending', order: 'ORD-2847', items: 5, location: 'Zona A', positions: ['A-01-03', 'A-02-01', 'A-03-04'], deadline: '11:00', assignedAt: '08:30' },
  { id: 'TASK-002', type: 'putaway', priority: 'high', status: 'in_progress', container: 'MSKU884762', items: 150, location: 'Zona B', positions: ['B-01-01', 'B-01-02', 'B-02-01'], deadline: '12:30', assignedAt: '09:00', progress: 45 },
  { id: 'TASK-003', type: 'picking', priority: 'normal', status: 'pending', order: 'ORD-2848', items: 3, location: 'Zona C', positions: ['C-01-01', 'C-02-03'], deadline: '14:00', assignedAt: '08:45' },
  { id: 'TASK-004', type: 'transfer', priority: 'normal', status: 'pending', sku: 'SKU-5521', qty: 200, from: 'C-01-02', to: 'C-03-02', deadline: '15:00', assignedAt: '09:15' },
  { id: 'TASK-005', type: 'picking', priority: 'high', status: 'pending', order: 'ORD-2849', items: 8, location: 'Zona A', positions: ['A-01-01', 'A-01-05', 'A-02-03', 'A-03-01'], deadline: '13:00', assignedAt: '09:30' },
  { id: 'TASK-006', type: 'putaway', priority: 'normal', status: 'completed', container: 'MSKU884761', items: 120, location: 'Zona D', positions: ['D-01-01', 'D-01-02'], deadline: '10:30', assignedAt: '08:00', completedAt: '10:20' },
  { id: 'TASK-007', type: 'picking', priority: 'normal', status: 'completed', order: 'ORD-2844', items: 4, location: 'Zona B', positions: ['B-02-01', 'B-03-02'], deadline: '10:00', assignedAt: '08:15', completedAt: '09:55' },
  { id: 'TASK-008', type: 'transfer', priority: 'high', status: 'pending', sku: 'SKU-3345', qty: 100, from: 'E-01-01', to: 'E-02-03', deadline: '11:30', assignedAt: '09:45' },
];

const taskFilters = ['Todas', 'Pendientes', 'En Progreso', 'Completadas'];
const typeFilters = ['Todos', 'Picking', 'Ubicación', 'Traslado'];

export default function WarehouseOperatorTasks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [selectedTask, setSelectedTask] = useState(null);

  const filteredTasks = allTasks.filter(task => {
    const matchesSearch = task.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.order && task.order.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (task.container && task.container.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (task.sku && task.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'Todas' || 
                         (statusFilter === 'Pendientes' && task.status === 'pending') ||
                         (statusFilter === 'En Progreso' && task.status === 'in_progress') ||
                         (statusFilter === 'Completadas' && task.status === 'completed');
    
    const matchesType = typeFilter === 'Todos' ||
                       (typeFilter === 'Picking' && task.type === 'picking') ||
                       (typeFilter === 'Ubicación' && task.type === 'putaway') ||
                       (typeFilter === 'Traslado' && task.type === 'transfer');
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    pending: allTasks.filter(t => t.status === 'pending').length,
    inProgress: allTasks.filter(t => t.status === 'in_progress').length,
    completed: allTasks.filter(t => t.status === 'completed').length,
    urgent: allTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length,
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'picking': return <Package className="w-5 h-5" />;
      case 'putaway': return <MapPin className="w-5 h-5" />;
      case 'transfer': return <ArrowLeftRight className="w-5 h-5" />;
      default: return <ClipboardList className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'picking': return 'Picking';
      case 'putaway': return 'Ubicación';
      case 'transfer': return 'Traslado';
      default: return type;
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <PlayCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="space-y-6" data-testid="warehouse-op-tasks">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mis Tareas</h1>
        <p className="text-slate-500">Gestiona y completa tus tareas asignadas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                <p className="text-xs text-slate-500">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <PlayCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                <p className="text-xs text-slate-500">En Progreso</p>
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
                <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
                <p className="text-xs text-slate-500">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
                <p className="text-xs text-slate-500">Urgentes</p>
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
                placeholder="Buscar por ID, orden, contenedor o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {taskFilters.map(filter => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(filter)}
                  className={statusFilter === filter ? "bg-violet-600 hover:bg-violet-700" : ""}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            {typeFilters.map(filter => (
              <Button
                key={filter}
                variant={typeFilter === filter ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(filter)}
                className={typeFilter === filter ? "bg-slate-800 hover:bg-slate-900" : ""}
              >
                {filter}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <Card 
            key={task.id} 
            className={`bg-white border-2 transition-all ${
              task.priority === 'urgent' && task.status !== 'completed' 
                ? 'border-red-300' 
                : task.priority === 'high' && task.status !== 'completed'
                ? 'border-amber-300'
                : 'border-slate-200'
            }`}
          >
            <CardContent className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Task Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-xl ${
                    task.type === 'picking' ? 'bg-blue-100 text-blue-600' :
                    task.type === 'putaway' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {getTypeIcon(task.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-800">{task.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                        {task.status === 'pending' ? 'Pendiente' : task.status === 'in_progress' ? 'En Progreso' : 'Completada'}
                      </span>
                      {task.priority !== 'normal' && task.status !== 'completed' && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'urgent' ? 'URGENTE' : 'ALTA'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-600 mb-2">{getTypeLabel(task.type)}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                      {task.order && <span>Orden: <strong className="text-slate-700">{task.order}</strong></span>}
                      {task.container && <span>Contenedor: <strong className="text-slate-700">{task.container}</strong></span>}
                      {task.sku && <span>SKU: <strong className="text-slate-700">{task.sku}</strong></span>}
                      {task.items && <span>{task.items} artículos</span>}
                      {task.qty && <span>{task.qty} unidades</span>}
                      <span>Ubicación: <strong className="text-slate-700">{task.location || `${task.from} → ${task.to}`}</strong></span>
                    </div>
                    {task.positions && (
                      <div className="flex gap-2 mt-2">
                        {task.positions.map((pos, idx) => (
                          <span key={idx} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-mono">
                            {pos}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress & Actions */}
                <div className="flex flex-col items-end gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>Límite: <strong className="text-slate-700">{task.deadline}</strong></span>
                    </div>
                    {task.status === 'in_progress' && task.progress && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">Progreso</span>
                          <span className="font-medium text-violet-600">{task.progress}%</span>
                        </div>
                        <div className="w-32 bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-violet-600 h-2 rounded-full"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {task.status === 'pending' && (
                    <Button className="bg-violet-600 hover:bg-violet-700">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Iniciar
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Completar
                    </Button>
                  )}
                  {task.status === 'completed' && (
                    <span className="text-sm text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Completada a las {task.completedAt}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <Card className="bg-white border-slate-200">
            <CardContent className="py-12 text-center">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No se encontraron tareas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
