import React, { useState, useEffect } from 'react';
import { getAccountStatement } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  CreditCard, 
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

const transactionTypeConfig = {
  'charge': { icon: TrendingUp, color: 'text-red-600', label: 'Cargo' },
  'payment': { icon: TrendingDown, color: 'text-emerald-600', label: 'Pago' },
  'credit': { icon: Receipt, color: 'text-blue-600', label: 'Crédito' },
};

const AccountStatement = () => {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatement();
  }, []);

  const fetchStatement = async () => {
    try {
      const response = await getAccountStatement();
      setStatement(response.data);
    } catch (error) {
      console.error('Error fetching statement:', error);
      toast.error('Error al cargar el estado de cuenta');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!statement) {
    return (
      <Card className="border-slate-200 rounded-sm">
        <CardContent className="p-12 text-center">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No se pudo cargar el estado de cuenta</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="account-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Estado de Cuenta</h1>
          <p className="text-slate-500 mt-1">Resumen financiero y transacciones</p>
        </div>
        <Button 
          variant="outline" 
          className="rounded-sm"
          onClick={() => toast.info('Descarga en desarrollo')}
          data-testid="download-statement-btn"
        >
          <Download className="w-4 h-4 mr-2" />
          Descargar PDF
        </Button>
      </div>

      {/* Account Info */}
      <Card className="border-slate-200 rounded-sm shadow-sm bg-slate-900 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/10 rounded-sm">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <p className="text-slate-300 text-sm">Cliente</p>
                <p className="text-xl font-bold">{statement.client_name}</p>
                <p className="text-slate-400 text-sm">No. Cuenta: {statement.account_number}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Saldo Actual</p>
                <p className={`text-3xl font-bold ${statement.current_balance >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(Math.abs(statement.current_balance))}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {statement.current_balance >= 0 ? 'Por pagar' : 'A favor'}
                </p>
              </div>
              <div className="p-3 bg-slate-100 rounded-sm">
                <Wallet className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Línea de Crédito</p>
                <p className="text-3xl font-bold text-slate-900">
                  {formatCurrency(statement.credit_limit)}
                </p>
                <p className="text-sm text-slate-500 mt-1">Límite aprobado</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-sm">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 rounded-sm shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">Crédito Disponible</p>
                <p className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(statement.available_credit)}
                </p>
                <p className="text-sm text-slate-500 mt-1">Para usar</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-sm">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Usage Bar */}
      <Card className="border-slate-200 rounded-sm shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">Uso de Línea de Crédito</p>
            <p className="text-sm text-slate-500">
              {((statement.credit_limit - statement.available_credit) / statement.credit_limit * 100).toFixed(1)}% utilizado
            </p>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ 
                width: `${Math.min(((statement.credit_limit - statement.available_credit) / statement.credit_limit * 100), 100)}%` 
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="border-slate-200 rounded-sm shadow-sm">
        <CardHeader className="border-b border-slate-200">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-400" />
            Historial de Transacciones
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Fecha
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Descripción
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tipo
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Monto
                </TableHead>
                <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Saldo
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statement.transactions.map((transaction, index) => {
                const typeConfig = transactionTypeConfig[transaction.type] || transactionTypeConfig.charge;
                const TypeIcon = typeConfig.icon;
                
                return (
                  <TableRow 
                    key={transaction.id}
                    className="hover:bg-slate-50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${index * 0.02}s` }}
                  >
                    <TableCell className="text-sm text-slate-600">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{transaction.description}</p>
                        {transaction.order_number && (
                          <p className="text-xs text-slate-500">{transaction.order_number}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-sm text-xs">
                        <TypeIcon className={`w-3 h-3 mr-1 ${typeConfig.color}`} />
                        {typeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${transaction.amount >= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900">
                      {formatCurrency(transaction.balance)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountStatement;
