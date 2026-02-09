import React, { useState, useEffect } from 'react';
import { getContainers } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  Search, 
  Filter,
  Package,
  Ship,
  Anchor,
  CheckCircle,
  Clock,
  MapPin
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

const Containers = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

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
                  Tipo / Tamaño
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Ruta
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Buque
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Estado
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContainers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
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
                  
                  return (
                    <TableRow 
                      key={container.id}
                      className="hover:bg-slate-50 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 0.03}s` }}
                    >
                      <TableCell className="font-mono font-medium text-slate-900">
                        {container.container_number}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <div>
                          <p className="font-medium">{container.type}</p>
                          <p className="text-sm text-slate-400">{container.size}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          <span>{container.origin} → {container.destination}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {container.vessel_name || '-'}
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
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Containers;
