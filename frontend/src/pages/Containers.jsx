import React, { useState, useEffect } from 'react';
import { getContainers, getContainerTracking, getContainerAdditionals } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { 
  Search, 
  Filter,
  Package,
  Ship,
  Anchor,
  CheckCircle,
  Clock,
  MapPin,
  Eye,
  Train,
  Truck,
  Calendar,
  FileText,
  Building,
  ArrowRight,
  Circle,
  CheckCircle2,
  Loader2,
  Receipt,
  AlertTriangle,
  X,
  DollarSign,
  FileCheck,
  FileX
} from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  'En Puerto Origen': { 
    color: 'bg-slate-50 text-slate-700 border-slate-200', 
    icon: Anchor 
  },
  'En Tránsito': { 
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: Ship 
  },
  'En Aduana': { 
    color: 'bg-purple-50 text-purple-700 border-purple-200', 
    icon: Clock 
  },
  'En Puerto Destino': { 
    color: 'bg-amber-50 text-amber-700 border-amber-200', 
    icon: Anchor 
  },
  'Entregado': { 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
    icon: CheckCircle 
  },
};

const transportModeConfig = {
  'maritime': { label: 'Marítimo', icon: Ship, color: 'text-blue-600' },
  'intermodal_train': { label: 'Intermodal (Tren)', icon: Train, color: 'text-purple-600' },
  'truck': { label: 'Terrestre', icon: Truck, color: 'text-amber-600' },
};

const trackingEventIcons = {
  'vessel_arrival': Ship,
  'customs_request': FileText,
  'terminal_departure': Building,
  'intermodal_arrival': Train,
  'intermodal_departure': Train,
  'cedis_appointment': Calendar,
  'cedis_arrival': Building,
  'warehouse_departure': Package,
  'empty_return': Package,
};

const additionalTypeColors = {
  'DEMORA': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'ALMACENAJE': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'MANIOBRA': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'INSPECCION': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'TRANSPORTE': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'SEGURO': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'DOCUMENTACION': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

const additionalStatusConfig = {
  'pending': { label: 'Pendiente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  'approved': { label: 'Aprobado', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  'rejected': { label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: X },
};

const TrackingTimeline = ({ tracking, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="text-center py-12 text-slate-500">
        No hay información de tracking disponible
      </div>
    );
  }

  const transportConfig = transportModeConfig[tracking.transport_mode] || transportModeConfig.maritime;
  const TransportIcon = transportConfig.icon;

  return (
    <div className="space-y-6">
      {/* Transport Mode Badge */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-sm">
        <TransportIcon className={`w-5 h-5 ${transportConfig.color}`} />
        <span className="text-sm font-medium text-slate-700">
          Modo de Transporte: {transportConfig.label}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {tracking.events.map((event, index) => {
          const EventIcon = trackingEventIcons[event.event_key] || Circle;
          const isLast = index === tracking.events.length - 1;
          
          let statusStyles = {};
          let dotStyles = {};
          
          if (event.status === 'completed') {
            statusStyles = { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' };
            dotStyles = { bg: 'bg-emerald-500', ring: 'ring-emerald-100' };
          } else if (event.status === 'in_progress') {
            statusStyles = { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
            dotStyles = { bg: 'bg-blue-500', ring: 'ring-blue-100' };
          } else {
            statusStyles = { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500' };
            dotStyles = { bg: 'bg-slate-300', ring: 'ring-slate-100' };
          }

          return (
            <div key={event.event_key} className="relative flex gap-4 pb-8">
              {/* Timeline line */}
              {!isLast && (
                <div 
                  className={`absolute left-[15px] top-[32px] w-0.5 h-[calc(100%-16px)] ${
                    event.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'
                  }`}
                />
              )}
              
              {/* Timeline dot */}
              <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${dotStyles.bg} ring-4 ${dotStyles.ring} flex items-center justify-center`}>
                {event.status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                ) : event.status === 'in_progress' ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Circle className="w-3 h-3 text-white" />
                )}
              </div>
              
              {/* Event content */}
              <div className={`flex-1 p-4 rounded-sm border ${statusStyles.border} ${statusStyles.bg} transition-all hover:shadow-sm`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <EventIcon className={`w-4 h-4 ${statusStyles.text}`} />
                      <h4 className={`font-semibold ${event.status === 'pending' ? 'text-slate-500' : 'text-slate-900'}`}>
                        {event.event_name}
                      </h4>
                      {event.status === 'in_progress' && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">En Proceso</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      {event.location && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <MapPin className="w-3 h-3" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-4 mt-2">
                        {event.scheduled_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-500">
                              Programado: {new Date(event.scheduled_date).toLocaleString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                        
                        {event.actual_date && (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 font-medium">
                              Real: {new Date(event.actual_date).toLocaleString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {event.notes && (
                        <p className="text-xs text-slate-400 mt-2">{event.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className={`px-2 py-1 rounded text-xs font-medium ${statusStyles.text} ${statusStyles.bg} border ${statusStyles.border}`}>
                    {event.status === 'completed' ? 'Completado' : event.status === 'in_progress' ? 'En Proceso' : 'Pendiente'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdditionalsPopup = ({ additionals, loading, containerNumber }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!additionals || additionals.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <p>No hay adicionales para este contenedor</p>
      </div>
    );
  }

  const totalAmount = additionals.reduce((sum, add) => sum + add.amount, 0);
  const pendingCount = additionals.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 rounded-sm border border-slate-200">
          <p className="text-sm text-slate-500 uppercase tracking-wider">Total Adicionales</p>
          <p className="text-2xl font-bold text-slate-900">{additionals.length}</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-sm border border-amber-200">
          <p className="text-sm text-amber-600 uppercase tracking-wider">Pendientes</p>
          <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-sm border border-slate-200">
          <p className="text-sm text-slate-500 uppercase tracking-wider">Monto Total</p>
          <p className="text-2xl font-bold text-slate-900">
            ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Additionals List */}
      <div className="space-y-3">
        {additionals.map((additional, index) => {
          const typeColor = additionalTypeColors[additional.type] || additionalTypeColors.DOCUMENTACION;
          const statusConf = additionalStatusConfig[additional.status] || additionalStatusConfig.pending;
          const StatusIcon = statusConf.icon;

          return (
            <div 
              key={additional.id}
              className={`p-4 rounded-sm border ${typeColor.border} ${typeColor.bg} animate-fade-in`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Type and Reason Code */}
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={`rounded-sm font-mono text-xs ${typeColor.text} ${typeColor.border}`}>
                      {additional.reason_code}
                    </Badge>
                    <Badge className={`rounded-sm text-xs ${typeColor.bg} ${typeColor.text}`}>
                      {additional.type}
                    </Badge>
                  </div>
                  
                  {/* Description */}
                  <p className="font-medium text-slate-900 mb-2">{additional.reason_description}</p>
                  
                  {/* Dates */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>Solicitado: {new Date(additional.requested_at).toLocaleDateString('es-MX')}</span>
                    </div>
                    {additional.approved_at && (
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>Aprobado: {new Date(additional.approved_at).toLocaleDateString('es-MX')}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Amount and Status */}
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900 mb-2">
                    ${additional.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
                  <Badge className={`rounded-sm ${statusConf.color}`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConf.label}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Containers = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  
  // Tracking modal state
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  
  // Additionals modal state
  const [showAdditionalsModal, setShowAdditionalsModal] = useState(false);
  const [additionals, setAdditionals] = useState(null);
  const [additionalsLoading, setAdditionalsLoading] = useState(false);

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      const response = await getContainers();
      setContainers(response.data);
    } catch (error) {
      console.error('Error fetching containers:', error);
      toast.error('Error al cargar los contenedores');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTracking = async (container) => {
    setSelectedContainer(container);
    setShowTrackingModal(true);
    setTrackingLoading(true);
    
    try {
      const response = await getContainerTracking(container.id);
      setTracking(response.data);
    } catch (error) {
      console.error('Error fetching tracking:', error);
      toast.error('Error al cargar el tracking');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleViewAdditionals = async (container) => {
    setSelectedContainer(container);
    setShowAdditionalsModal(true);
    setAdditionalsLoading(true);
    
    try {
      const response = await getContainerAdditionals(container.id);
      setAdditionals(response.data);
    } catch (error) {
      console.error('Error fetching additionals:', error);
      toast.error('Error al cargar los adicionales');
    } finally {
      setAdditionalsLoading(false);
    }
  };

  const filteredContainers = containers.filter(container => {
    const matchesSearch = container.container_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          container.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          container.destination.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || container.status === statusFilter;
    const matchesType = typeFilter === 'all' || container.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const containerTypes = [...new Set(containers.map(c => c.type))];
  const containerStatuses = [...new Set(containers.map(c => c.status))];

  // Stats
  const stats = {
    total: containers.length,
    inTransit: containers.filter(c => c.status === 'En Tránsito').length,
    inCustoms: containers.filter(c => c.status === 'En Aduana').length,
    delivered: containers.filter(c => c.status === 'Entregado').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="containers-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Contenedores</h1>
        <p className="text-slate-500 mt-1">Seguimiento y estado de sus contenedores</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Total</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">En Tránsito</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inTransit}</p>
              </div>
              <Ship className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">En Aduana</p>
                <p className="text-2xl font-bold text-purple-600">{stats.inCustoms}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Entregados</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.delivered}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por número, origen o destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-sm border-slate-200"
            data-testid="search-containers"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 rounded-sm" data-testid="container-status-filter">
            <Filter className="w-4 h-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {containerStatuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40 rounded-sm" data-testid="container-type-filter">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {containerTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Containers Table */}
      <Card className="border-slate-200 rounded-sm shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Contenedor
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ruta
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Transporte
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Estado
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Facturado
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Adicionales
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContainers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No se encontraron contenedores</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredContainers.map((container, index) => {
                  const statusInfo = statusConfig[container.status] || { 
                    color: 'bg-slate-50 text-slate-700', 
                    icon: Package 
                  };
                  const StatusIcon = statusInfo.icon;
                  const transportConfig = transportModeConfig[container.transport_mode] || transportModeConfig.maritime;
                  const TransportIcon = transportConfig.icon;
                  
                  return (
                    <TableRow 
                      key={container.id}
                      className="hover:bg-slate-50 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <TableCell>
                        <div>
                          <p className="font-mono font-medium text-slate-900">{container.container_number}</p>
                          <p className="text-xs text-slate-400">{container.type} - {container.size}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span className="text-sm">{container.origin}</span>
                          <ArrowRight className="w-3 h-3 text-slate-300" />
                          <span className="text-sm">{container.destination}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TransportIcon className={`w-4 h-4 ${transportConfig.color}`} />
                          <span className="text-sm text-slate-600">{transportConfig.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`rounded-sm flex items-center gap-1.5 w-fit ${statusInfo.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {container.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {container.is_invoiced ? (
                          <div className="flex flex-col items-center">
                            <Badge className="bg-emerald-100 text-emerald-700 rounded-sm">
                              <FileCheck className="w-3 h-3 mr-1" />
                              Facturado
                            </Badge>
                            <span className="text-xs text-slate-400 mt-1">{container.invoice_number}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="rounded-sm text-slate-500 border-slate-300">
                            <FileX className="w-3 h-3 mr-1" />
                            Sin Facturar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {container.has_additionals ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-sm border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleViewAdditionals(container)}
                            data-testid={`view-additionals-${container.id}`}
                          >
                            <AlertTriangle className="w-4 h-4 mr-1" />
                            {container.additionals_count} Adicional{container.additionals_count > 1 ? 'es' : ''}
                          </Button>
                        ) : (
                          <span className="text-sm text-slate-400">Sin adicionales</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-sm"
                          onClick={() => handleViewTracking(container)}
                          data-testid={`view-tracking-${container.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Tracking
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tracking Modal */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <Package className="w-6 h-6 text-blue-600" />
              Tracking Detallado
            </DialogTitle>
          </DialogHeader>
          
          {selectedContainer && (
            <div className="space-y-4">
              {/* Container Info Header */}
              <div className="p-4 bg-slate-50 rounded-sm border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500 uppercase tracking-wider">Contenedor</p>
                    <p className="text-lg font-mono font-bold text-slate-900">{selectedContainer.container_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 uppercase tracking-wider">Ruta</p>
                    <p className="text-sm font-medium text-slate-700">
                      {selectedContainer.origin} → {selectedContainer.destination}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge 
                      variant="outline" 
                      className={`rounded-sm ${statusConfig[selectedContainer.status]?.color || 'bg-slate-50'}`}
                    >
                      {selectedContainer.status}
                    </Badge>
                    {selectedContainer.is_invoiced ? (
                      <Badge className="bg-emerald-100 text-emerald-700 rounded-sm">
                        <FileCheck className="w-3 h-3 mr-1" />
                        Facturado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-sm text-slate-500">
                        Sin Facturar
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <ScrollArea className="h-[450px] pr-4">
                <TrackingTimeline tracking={tracking} loading={trackingLoading} />
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Additionals Modal */}
      <Dialog open={showAdditionalsModal} onOpenChange={setShowAdditionalsModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <Receipt className="w-6 h-6 text-amber-600" />
              Adicionales del Contenedor
            </DialogTitle>
          </DialogHeader>
          
          {selectedContainer && (
            <div className="space-y-4">
              {/* Container Info Header */}
              <div className="p-4 bg-slate-50 rounded-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500 uppercase tracking-wider">Contenedor</p>
                    <p className="text-lg font-mono font-bold text-slate-900">{selectedContainer.container_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 uppercase tracking-wider">Ruta</p>
                    <p className="text-sm font-medium text-slate-700">
                      {selectedContainer.origin} → {selectedContainer.destination}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additionals List */}
              <ScrollArea className="h-[450px] pr-4">
                <AdditionalsPopup 
                  additionals={additionals} 
                  loading={additionalsLoading}
                  containerNumber={selectedContainer.container_number}
                />
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Containers;
