import React, { useState, useEffect } from 'react';
import { getAdditionals, approveAdditional, rejectAdditional } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { 
  Receipt, 
  Check, 
  X,
  Clock,
  AlertTriangle,
  DollarSign,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

const statusColors = {
  'Pendiente': 'bg-amber-50 text-amber-700 border-amber-200',
  'Aprobado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Rechazado': 'bg-red-50 text-red-700 border-red-200',
};

const Additionals = () => {
  const [additionals, setAdditionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null, additional: null });

  useEffect(() => {
    fetchAdditionals();
  }, []);

  const fetchAdditionals = async () => {
    try {
      const response = await getAdditionals();
      setAdditionals(response.data);
    } catch (error) {
      console.error('Error fetching additionals:', error);
      toast.error('Error al cargar los adicionales');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (additional) => {
    try {
      await approveAdditional(additional.id);
      toast.success('Adicional aprobado exitosamente');
      // Update local state
      setAdditionals(prev => 
        prev.map(a => a.id === additional.id ? { ...a, status: 'Aprobado' } : a)
      );
    } catch (error) {
      console.error('Error approving additional:', error);
      toast.error('Error al aprobar el adicional');
    }
    setConfirmDialog({ open: false, type: null, additional: null });
  };

  const handleReject = async (additional) => {
    try {
      await rejectAdditional(additional.id);
      toast.success('Adicional rechazado');
      // Update local state
      setAdditionals(prev => 
        prev.map(a => a.id === additional.id ? { ...a, status: 'Rechazado' } : a)
      );
    } catch (error) {
      console.error('Error rejecting additional:', error);
      toast.error('Error al rechazar el adicional');
    }
    setConfirmDialog({ open: false, type: null, additional: null });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const pendingAdditionals = additionals.filter(a => a.status === 'Pendiente');
  const processedAdditionals = additionals.filter(a => a.status !== 'Pendiente');
  const totalPending = pendingAdditionals.reduce((sum, a) => sum + a.amount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="additionals-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Adicionales</h1>
        <p className="text-slate-500 mt-1">Apruebe o rechace cargos adicionales de sus órdenes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Pendientes</p>
                <p className="text-3xl font-bold text-amber-600">{pendingAdditionals.length}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-sm">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Total Pendiente</p>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalPending)}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-sm">
                <DollarSign className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Procesados</p>
                <p className="text-3xl font-bold text-slate-600">{processedAdditionals.length}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-sm">
                <Check className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Additionals */}
      {pendingAdditionals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Requieren Aprobación
          </h2>
          <div className="space-y-4">
            {pendingAdditionals.map((additional, index) => (
              <Card 
                key={additional.id} 
                className="border-amber-200 rounded-sm shadow-sm bg-amber-50/30 animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge 
                          variant="outline" 
                          className={`rounded-sm ${statusColors[additional.status]}`}
                        >
                          {additional.status}
                        </Badge>
                        <span className="text-sm text-slate-500">{additional.order_number}</span>
                      </div>
                      <p className="text-lg font-medium text-slate-900 mb-1">
                        {additional.description}
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {formatCurrency(additional.amount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="rounded-sm border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setConfirmDialog({ open: true, type: 'reject', additional })}
                        data-testid={`reject-additional-${additional.id}`}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Rechazar
                      </Button>
                      <Button
                        className="rounded-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setConfirmDialog({ open: true, type: 'approve', additional })}
                        data-testid={`approve-additional-${additional.id}`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aprobar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Processed Additionals */}
      {processedAdditionals.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            Historial
          </h2>
          <div className="space-y-3">
            {processedAdditionals.map((additional, index) => (
              <Card 
                key={additional.id} 
                className="border-slate-200 rounded-sm shadow-sm animate-fade-in"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant="outline" 
                        className={`rounded-sm ${statusColors[additional.status]}`}
                      >
                        {additional.status}
                      </Badge>
                      <div>
                        <p className="font-medium text-slate-900">{additional.description}</p>
                        <p className="text-sm text-slate-500">{additional.order_number}</p>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(additional.amount)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {additionals.length === 0 && (
        <Card className="border-slate-200 rounded-sm">
          <CardContent className="p-12 text-center">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No hay adicionales registrados</p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, type: null, additional: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.type === 'approve' ? '¿Aprobar adicional?' : '¿Rechazar adicional?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'approve' 
                ? `Se aprobará el cargo de ${formatCurrency(confirmDialog.additional?.amount || 0)} por "${confirmDialog.additional?.description}".`
                : `Se rechazará el cargo de ${formatCurrency(confirmDialog.additional?.amount || 0)} por "${confirmDialog.additional?.description}".`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={`rounded-sm ${confirmDialog.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              onClick={() => {
                if (confirmDialog.type === 'approve') {
                  handleApprove(confirmDialog.additional);
                } else {
                  handleReject(confirmDialog.additional);
                }
              }}
            >
              {confirmDialog.type === 'approve' ? 'Aprobar' : 'Rechazar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Additionals;
