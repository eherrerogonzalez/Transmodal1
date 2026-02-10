import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { MessageCircle, X, Send, Bot, User, Minimize2, BarChart3, Table, PieChart } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell
} from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

// Simple Table Component
const DataTable = ({ title, columns, data, highlightRows = [] }) => (
  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden my-2">
    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
      <h4 className="font-semibold text-sm text-slate-800">{title}</h4>
    </div>
    <div className="overflow-x-auto max-h-48">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-2 py-1.5 text-left font-medium text-slate-600 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 15).map((row, rowIdx) => (
            <tr 
              key={rowIdx} 
              className={`border-t border-slate-100 ${highlightRows.includes(rowIdx) ? 'bg-red-50' : ''}`}
            >
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-2 py-1.5 whitespace-nowrap">
                  {typeof cell === 'number' ? cell.toLocaleString('es-MX') : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {data.length > 15 && (
      <div className="px-3 py-1 bg-slate-50 text-xs text-slate-500 border-t">
        Mostrando 15 de {data.length} registros
      </div>
    )}
  </div>
);

// Bar Chart Component
const DataBarChart = ({ title, labels, datasets }) => {
  const chartData = labels.map((label, idx) => {
    const item = { name: label };
    datasets.forEach(ds => {
      item[ds.label] = ds.data[idx];
    });
    return item;
  });

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 my-2">
      <h4 className="font-semibold text-sm text-slate-800 mb-2">{title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {datasets.map((ds, idx) => (
            <Bar key={ds.label} dataKey={ds.label} fill={ds.color || COLORS[idx % COLORS.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Pie Chart Component
const DataPieChart = ({ title, labels, data, colors }) => {
  const chartData = labels.map((label, idx) => ({
    name: label,
    value: data[idx]
  }));
  const pieColors = colors || COLORS;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 my-2">
      <h4 className="font-semibold text-sm text-slate-800 mb-2">{title}</h4>
      <ResponsiveContainer width="100%" height={180}>
        <RechartsPie>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
            ))}
          </Pie>
          <Tooltip />
        </RechartsPie>
      </ResponsiveContainer>
    </div>
  );
};

// Render data visualization based on type
const DataVisualization = ({ data }) => {
  if (!data) return null;

  if (data.type === 'table') {
    return <DataTable {...data} />;
  }

  if (data.type === 'multi_table') {
    return (
      <div className="space-y-2">
        {data.tables.map((table, idx) => (
          <DataTable key={idx} {...table} />
        ))}
      </div>
    );
  }

  if (data.type === 'chart') {
    if (data.chart_type === 'bar') {
      return <DataBarChart {...data} />;
    }
    if (data.chart_type === 'pie') {
      return <DataPieChart {...data} />;
    }
  }

  if (data.type === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-2 my-2 text-xs text-red-600">
        {data.message}
      </div>
    );
  }

  return null;
};

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: '¡Hola! Soy el asistente inteligente de Transmodal. Puedo ayudarte con:\n\n• Consultas de inventario y stock\n• Reportes de clientes finales (Walmart, Costco, etc.)\n• Gráficos y análisis de datos\n• Estado de pedidos y distribuciones\n• Rutas y tiempos de tránsito\n\n¿En qué puedo ayudarte?',
      data: null
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, data: null }]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(userMessage, sessionId);
      if (!sessionId && response.data.session_id) {
        setSessionId(response.data.session_id);
      }
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response,
        data: response.data.data  // Chart/table data
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Lo siento, hubo un error. Por favor intenta de nuevo.',
        data: null
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQueries = [
    { label: '📊 Inventario', query: 'Dame un reporte del inventario actual' },
    { label: '📈 Gráfico Stock', query: 'Muéstrame un gráfico del estado del inventario' },
    { label: '🏪 Clientes', query: 'Resumen de clientes finales' },
    { label: '⚠️ Críticos', query: 'Productos en estado crítico' },
  ];

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg z-50"
        data-testid="chatbot-toggle"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 bg-white rounded-lg shadow-2xl z-50 flex flex-col border border-slate-200 transition-all ${
        isMinimized ? 'w-80 h-14' : 'w-[450px] h-[600px]'
      }`}
      data-testid="chatbot-window"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <div>
            <span className="font-semibold">Asistente Transmodal</span>
            <span className="text-xs text-blue-200 ml-2">con datos en tiempo real</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-blue-500 h-8 w-8 p-0"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white hover:bg-blue-500 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Query Buttons */}
          <div className="flex gap-1 p-2 border-b border-slate-200 overflow-x-auto">
            {quickQueries.map((q, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => {
                  setInput(q.query);
                  setTimeout(() => handleSend(), 100);
                }}
                className="text-xs whitespace-nowrap h-7 px-2"
                disabled={isLoading}
              >
                {q.label}
              </Button>
            ))}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  <div className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] p-2.5 rounded-lg text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-slate-600" />
                      </div>
                    )}
                  </div>
                  {/* Render data visualization if present */}
                  {msg.data && msg.role === 'assistant' && (
                    <div className="ml-9 mt-1">
                      <DataVisualization data={msg.data} />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="bg-slate-100 p-3 rounded-lg rounded-bl-none">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Suggestions */}
          <div className="px-3 py-1 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">
              Prueba: "gráfico de inventario por marca", "reporte de Walmart", "productos críticos"
            </p>
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu consulta..."
                className="flex-1 rounded-full text-sm"
                disabled={isLoading}
                data-testid="chatbot-input"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="rounded-full w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700"
                data-testid="chatbot-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Chatbot;
