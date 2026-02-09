import React, { useState, useEffect } from 'react';
import { getContainerLocations } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Map, 
  Ship, 
  Package, 
  Anchor,
  CheckCircle,
  Clock,
  Navigation
} from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  'En Puerto Origen': { bg: 'bg-slate-500', text: 'text-slate-700' },
  'En Tránsito': { bg: 'bg-blue-500', text: 'text-blue-700' },
  'En Aduana': { bg: 'bg-purple-500', text: 'text-purple-700' },
  'En Puerto Destino': { bg: 'bg-amber-500', text: 'text-amber-700' },
  'Entregado': { bg: 'bg-emerald-500', text: 'text-emerald-700' },
};

const ContainerMap = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContainer, setSelectedContainer] = useState(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await getContainerLocations();
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Error al cargar ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  // Group containers by status for legend
  const statusCounts = locations.reduce((acc, loc) => {
    acc[loc.status] = (acc[loc.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-[600px] bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="map-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Mapa de Contenedores</h1>
        <p className="text-slate-500 mt-1">Visualice la ubicación de sus contenedores en tiempo real</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map Area */}
        <div className="lg:col-span-3">
          <Card className="border-slate-200 rounded-sm shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Simulated Map with markers */}
              <div className="relative w-full h-[600px] bg-gradient-to-br from-slate-100 to-slate-200">
                {/* World map background pattern */}
                <div 
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'%3E%3Cpath d='M 100 200 Q 200 100 300 200 T 500 200 T 700 200 T 900 200' fill='none' stroke='%23000' stroke-width='2'/%3E%3C/svg%3E")`,
                    backgroundSize: 'cover'
                  }}
                />
                
                {/* Map markers */}
                {locations.map((loc, index) => {
                  // Convert lat/lng to percentage position on our mock map
                  const x = ((loc.longitude + 180) / 360) * 100;
                  const y = ((90 - loc.latitude) / 180) * 100;
                  const statusColor = statusColors[loc.status]?.bg || 'bg-slate-500';
                  
                  return (
                    <button
                      key={index}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${statusColor} w-4 h-4 rounded-full shadow-lg hover:scale-150 transition-transform cursor-pointer z-10`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      onClick={() => setSelectedContainer(loc)}
                      data-testid={`map-marker-${index}`}
                    >
                      <span className="sr-only">{loc.container_id}</span>
                    </button>
                  );
                })}

                {/* Selected container popup */}
                {selectedContainer && (
                  <div 
                    className="absolute z-20 bg-white rounded-sm shadow-xl border border-slate-200 p-4 w-64"
                    style={{
                      left: `${((selectedContainer.longitude + 180) / 360) * 100}%`,
                      top: `${((90 - selectedContainer.latitude) / 180) * 100}%`,
                      transform: 'translate(-50%, -120%)'
                    }}
                  >
                    <button
                      className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                      onClick={() => setSelectedContainer(null)}
                    >
                      ×
                    </button>
                    <p className="font-mono font-bold text-slate-900 mb-2">
                      {selectedContainer.container_id}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="text-slate-600">
                        <span className="text-slate-400">Ruta:</span> {selectedContainer.origin} → {selectedContainer.destination}
                      </p>
                      <p className="text-slate-600">
                        <span className="text-slate-400">Buque:</span> {selectedContainer.vessel_name || '-'}
                      </p>
                      <Badge 
                        className={`mt-2 ${statusColors[selectedContainer.status]?.text} bg-opacity-10`}
                      >
                        {selectedContainer.status}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Map overlay info */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-sm shadow-lg p-4">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Leyenda</p>
                  <div className="space-y-2">
                    {Object.entries(statusCounts).map(([status, count]) => (
                      <div key={status} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${statusColors[status]?.bg || 'bg-slate-500'}`} />
                        <span className="text-xs text-slate-600">{status} ({count})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Map placeholder text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <Map className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">
                      Mapa interactivo - Haga clic en los marcadores para ver detalles
                    </p>
                    <p className="text-slate-300 text-xs mt-2">
                      (Integración con Google Maps pendiente)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Container List Sidebar */}
        <div className="lg:col-span-1">
          <Card className="border-slate-200 rounded-sm shadow-sm h-[600px]">
            <CardHeader className="border-b border-slate-200 py-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5 text-slate-400" />
                Contenedores ({locations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[520px]">
                <div className="divide-y divide-slate-100">
                  {locations.map((loc, index) => {
                    const isSelected = selectedContainer?.container_id === loc.container_id;
                    
                    return (
                      <button
                        key={index}
                        className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedContainer(loc)}
                        data-testid={`container-list-item-${index}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-mono font-medium text-sm text-slate-900">
                              {loc.container_id}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {loc.origin} → {loc.destination}
                            </p>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${statusColors[loc.status]?.bg || 'bg-slate-500'}`} />
                        </div>
                        <Badge 
                          variant="outline"
                          className={`mt-2 text-xs ${statusColors[loc.status]?.text || 'text-slate-700'}`}
                        >
                          {loc.status}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContainerMap;
