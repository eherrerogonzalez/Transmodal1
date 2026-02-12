import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Search, 
  Package, 
  Truck, 
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Calendar,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import api from '../lib/api';

// Colores para los niveles de stack
const STACK_COLORS = {
  1: 'bg-blue-500',
  2: 'bg-blue-400',
  3: 'bg-blue-300',
  4: 'bg-sky-400',
  5: 'bg-sky-300'
};

const STATUS_COLORS = {
  full: 'border-emerald-500',
  empty: 'border-slate-400'
};

export default function YardManagement() {
  const [layout, setLayout] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [retrievalPlan, setRetrievalPlan] = useState(null);
  const [departuresView, setDeparturesView] = useState('today');
  const [departures, setDepartures] = useState({ today: [], week: [] });

  useEffect(() => {
    loadYardData();
  }, []);

  const loadYardData = async () => {
    setLoading(true);
    try {
      const [layoutRes, statsRes] = await Promise.all([
        api.get('/yard/layout'),
        api.get('/yard/stats')
      ]);
      setLayout(layoutRes.data);
      setStats(statsRes.data);
      setDepartures({
        today: statsRes.data.departures_today || [],
        week: statsRes.data.departures_this_week || []
      });
    } catch (error) {
      toast.error('Error al cargar datos del patio');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Ingresa un número de contenedor');
      return;
    }
    
    try {
      const response = await api.get(`/yard/search/${searchQuery.trim()}`);
      setSelectedContainer(response.data);
      toast.success(`Contenedor encontrado en ${response.data.position.full_position}`);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Contenedor no encontrado en el patio');
      } else {
        toast.error('Error al buscar contenedor');
      }
      setSelectedContainer(null);
    }
  };

  const handleOptimizeRetrieval = async (containerNumber) => {
    try {
      const response = await api.post(`/yard/optimize-retrieval/${containerNumber}`);
      setRetrievalPlan(response.data);
      toast.success('Plan de recuperación calculado');
    } catch (error) {
      toast.error('Error al calcular plan de recuperación');
    }
  };

  const handleResetYard = async () => {
    try {
      await api.post('/yard/reset');
      toast.success('Datos del patio regenerados');
      loadYardData();
      setSelectedContainer(null);
      setRetrievalPlan(null);
    } catch (error) {
      toast.error('Error al regenerar datos');
    }
  };

  const getCellColor = (cell) => {
    if (!cell.is_occupied) return 'bg-slate-800/50';
    const ratio = cell.total_containers / cell.max_stack;
    if (ratio >= 0.8) return 'bg-red-900/60';
    if (ratio >= 0.6) return 'bg-amber-900/60';
    return 'bg-emerald-900/60';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="yard-management-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Gestión de Patio</h1>
          <p className="text-slate-400">Visualización y optimización de contenedores</p>
        </div>
        <Button 
          onClick={handleResetYard} 
          variant="outline" 
          className="border-slate-600"
          data-testid="reset-yard-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Regenerar Datos
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Box className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.total_occupied}</p>
                <p className="text-xs text-slate-400">Total Contenedores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Package className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.full_containers}</p>
                <p className="text-xs text-slate-400">Llenos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-500/20 rounded-lg">
                <Box className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.empty_containers}</p>
                <p className="text-xs text-slate-400">Vacíos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats?.utilization_percent}%</p>
                <p className="text-xs text-slate-400">Utilización</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Yard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yard Grid */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-400" />
                Layout del Patio
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Column headers */}
              <div className="flex mb-2 pl-8">
                {Array.from({ length: layout?.columns || 0 }, (_, i) => (
                  <div key={i} className="w-10 text-center text-xs text-slate-400 font-mono">
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
              </div>
              
              {/* Grid */}
              <div className="space-y-1">
                {Array.from({ length: layout?.rows || 0 }, (_, rowIdx) => (
                  <div key={rowIdx} className="flex items-center">
                    <div className="w-8 text-xs text-slate-400 font-mono">{rowIdx + 1}</div>
                    <div className="flex gap-1">
                      {layout?.cells
                        .filter(cell => cell.row === rowIdx + 1)
                        .sort((a, b) => a.column - b.column)
                        .map(cell => {
                          const isSelected = selectedContainer && 
                            selectedContainer.position.row === cell.row && 
                            selectedContainer.position.column === cell.column;
                          
                          return (
                            <div
                              key={`${cell.row}-${cell.column}`}
                              className={`w-10 h-10 rounded-sm flex flex-col items-center justify-center cursor-pointer transition-all ${getCellColor(cell)} ${isSelected ? 'ring-2 ring-yellow-400' : ''}`}
                              onClick={() => {
                                if (cell.containers.length > 0) {
                                  const topContainer = cell.containers[cell.containers.length - 1];
                                  setSearchQuery(topContainer.container_number);
                                  handleSearch();
                                }
                              }}
                              title={`${cell.column_letter}${cell.row}: ${cell.total_containers}/${cell.max_stack} contenedores`}
                              data-testid={`cell-${cell.column_letter}${cell.row}`}
                            >
                              {cell.is_occupied && (
                                <>
                                  <span className="text-xs font-bold text-white">{cell.total_containers}</span>
                                  <div className="flex gap-px">
                                    {cell.containers.map((c, i) => (
                                      <div 
                                        key={i} 
                                        className={`w-1.5 h-1.5 rounded-full ${c.status === 'full' ? 'bg-emerald-400' : 'bg-slate-400'}`}
                                      />
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-slate-800/50" />
                  <span>Vacío</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-emerald-900/60" />
                  <span>&lt;60%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-amber-900/60" />
                  <span>60-80%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-sm bg-red-900/60" />
                  <span>&gt;80%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Lleno</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Vacío</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Details */}
        <div className="space-y-4">
          {/* Search */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                Buscar Contenedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Ej: MSKU1234567"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="bg-slate-900/50 border-slate-600 text-white"
                  data-testid="search-container-input"
                />
                <Button 
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="search-container-btn"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Selected Container Details */}
          {selectedContainer && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  Contenedor Encontrado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-slate-900/50 rounded-lg">
                  <p className="text-lg font-mono font-bold text-white">{selectedContainer.container.container_number}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-slate-400">Posición:</span>
                      <span className="ml-2 text-white font-mono">{selectedContainer.position.full_position}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Tamaño:</span>
                      <span className="ml-2 text-white">{selectedContainer.container.size}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Estado:</span>
                      <span className={`ml-2 ${selectedContainer.container.status === 'full' ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {selectedContainer.container.status === 'full' ? 'Lleno' : 'Vacío'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Cliente:</span>
                      <span className="ml-2 text-white">{selectedContainer.container.client_name}</span>
                    </div>
                  </div>
                  {selectedContainer.containers_above > 0 && (
                    <div className="mt-2 p-2 bg-amber-500/20 rounded text-amber-300 text-sm">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      {selectedContainer.containers_above} contenedor(es) encima
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={() => handleOptimizeRetrieval(selectedContainer.container.container_number)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  data-testid="optimize-retrieval-btn"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Calcular Plan de Recuperación
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Retrieval Plan */}
          {retrievalPlan && retrievalPlan.found && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-400" />
                  Plan de Recuperación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <p className="text-sm text-blue-300">{retrievalPlan.message}</p>
                </div>
                
                {retrievalPlan.retrieval_plan && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Movimientos necesarios:</span>
                      <span className="text-white font-bold">{retrievalPlan.retrieval_plan.total_moves}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Tiempo estimado:</span>
                      <span className="text-white font-bold">{retrievalPlan.retrieval_plan.estimated_time_minutes} min</span>
                    </div>

                    {retrievalPlan.retrieval_plan.moves_required.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <p className="text-sm text-slate-400 font-medium">Secuencia de movimientos:</p>
                        {retrievalPlan.retrieval_plan.moves_required.map((move, i) => (
                          <div key={i} className="p-2 bg-slate-900/50 rounded flex items-center gap-2 text-sm">
                            <span className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white">{i + 1}</span>
                            <span className="font-mono text-slate-300">{move.container_number.slice(-7)}</span>
                            <span className="text-slate-500">{move.from_position}</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span className="text-emerald-400">{move.to_position}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Departures Section */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              Salidas Programadas
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={departuresView === 'today' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDeparturesView('today')}
                className={departuresView === 'today' ? 'bg-blue-600' : 'text-slate-400'}
              >
                Hoy ({departures.today.length})
              </Button>
              <Button
                variant={departuresView === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDeparturesView('week')}
                className={departuresView === 'week' ? 'bg-blue-600' : 'text-slate-400'}
              >
                Esta Semana ({departures.week.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(departuresView === 'today' ? departures.today : departures.week).length === 0 ? (
            <p className="text-slate-400 text-center py-4">No hay salidas programadas</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(departuresView === 'today' ? departures.today : departures.week).map((dep, i) => (
                <div 
                  key={i} 
                  className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 hover:border-blue-500/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSearchQuery(dep.container);
                    handleSearch();
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-bold text-white">{dep.container}</p>
                      <p className="text-sm text-slate-400">{dep.client}</p>
                    </div>
                    <span className="text-xs font-mono bg-slate-700 px-2 py-1 rounded text-slate-300">{dep.position}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Truck className="w-3 h-3 text-slate-500" />
                    <span className="text-slate-400">{dep.destination}</span>
                  </div>
                  {dep.expected_date && (
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span className="text-slate-400">{dep.expected_date}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats by Client */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.by_client && Object.entries(stats.by_client)
                .filter(([client]) => client !== 'N/A')
                .sort((a, b) => b[1] - a[1])
                .map(([client, count]) => (
                  <div key={client} className="flex items-center justify-between">
                    <span className="text-slate-300">{client}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(count / stats.full_containers) * 100}%` }}
                        />
                      </div>
                      <span className="text-white font-bold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Por Tamaño</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.by_size && Object.entries(stats.by_size)
                .sort((a, b) => b[1] - a[1])
                .map(([size, count]) => (
                  <div key={size} className="flex items-center justify-between">
                    <span className="text-slate-300">{size}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(count / stats.total_occupied) * 100}%` }}
                        />
                      </div>
                      <span className="text-white font-bold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
