# Transmodal Client Portal - PRD

## Problem Statement
Aplicación web para clientes de Transmodal para gestión de cadena de suministro:
- **Objetivo Principal**: Garantizar que el cliente final NUNCA se quede sin producto
- Crear órdenes de contenedores (inbounds)
- Subir fotos y documentos a una orden
- Ver el estatus de sus contenedores
- Aprobar adicionales
- Dashboard con KPIs (contenedores movidos, gasto en logística, emisiones CO2)
- Mapa de tracking de contenedores
- Estado de cuenta
- **Planificación de cadena de suministro integrada**: ORIGEN → INBOUND → CEDIS → DISTRIBUCIÓN → CLIENTE FINAL

## User Personas
- **Cliente Corporativo** (ej: Pernod Ricard): Empresas que importan productos y los distribuyen a retailers como Walmart, Costco, HEB

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI (Python) con endpoints mock
- **Database**: MongoDB (para productos y citas creadas)
- **Auth**: Token JWT simulado (para futura integración con ERP)

## Core Requirements (Static)
1. Autenticación con token del ERP (mock)
2. Dashboard con métricas de operaciones
3. Gestión de órdenes de contenedores (inbounds)
4. Tracking de contenedores en mapa
5. Aprobación de cargos adicionales
6. Estado de cuenta del cliente
7. **Planificación de tiempo de tránsito** - calcular cuándo pedir a origen
8. **Visibilidad de inventario de clientes finales** (Walmart, Costco, HEB, etc.)
9. **Plan de cadena de suministro integrado** para evitar desabasto

## What's Been Implemented ✅
**Date: 2026-02-10**

### Backend (FastAPI)
- POST /api/auth/login - Autenticación mock
- GET /api/auth/me - Info del usuario
- GET /api/dashboard - KPIs y datos de gráficos
- GET /api/containers - Lista de contenedores
- GET /api/containers/locations/all - Ubicaciones para mapa
- GET/POST /api/orders - CRUD de órdenes
- POST /api/orders/{id}/documents - Upload de documentos
- GET /api/additionals - Lista de adicionales
- PUT /api/additionals/{id}/approve|reject - Aprobar/rechazar
- GET /api/account-statement - Estado de cuenta
- **GET /api/planning/transit-routes** - Rutas de tránsito con lead times
- **GET /api/planning/restock-predictions** - Predicciones de reabastecimiento
- **GET /api/planning/restock-timeline** - Timeline de 30 días
- **GET /api/planning/supply-chain** - Plan integrado de cadena de suministro
- **GET /api/planning/distribution-orders** - Órdenes de distribución pendientes
- **GET /api/planning/action-items** - Acciones a tomar hoy
- **GET /api/inventory/end-clients** - Lista de clientes finales (Walmart, etc.)
- **GET /api/inventory/end-clients/{name}** - Inventario detallado por cliente
- **GET /api/inventory/end-clients-overview** - Resumen de todos los clientes
- POST /api/inventory/products - Crear nuevo producto
- GET /api/inventory/{sku}/positions - Posiciones en almacén
- POST /api/appointments - Crear cita de entrega (inbound)

### Frontend (React)
- Login page con imagen de fondo
- Dashboard con 4 KPIs + 3 gráficos (Recharts)
- Órdenes: lista, búsqueda, filtros, crear orden, ver detalle
- Contenedores: tabla con filtros por estado y tipo
- Mapa placeholder
- Adicionales: aprobar/rechazar con confirmación
- Estado de Cuenta: balance, línea de crédito, transacciones
- **Cadena de Suministro (NUEVA)**:
  - Flujo visual: ORIGEN → INBOUND → CEDIS → DISTRIBUCIÓN → CLIENTE FINAL
  - Panel de acciones: Pedir a Origen, Distribuir Urgente, Alertas Cliente Final
  - Plan por producto con fechas críticas
- **Clientes Finales**: Cards de Walmart, Costco, HEB, Soriana, Chedraui, La Comer
- **Distribución**: Órdenes pendientes por prioridad y cliente
- Inventario CEDIS con posiciones
- Citas de entrega (inbounds)
- Sidebar navigation colapsable
- Responsive design

## Data Flow (Supply Chain)
```
1. ORIGEN (Shanghai, Rotterdam, etc.)
   ↓ Inbound Lead Time (25-37 días)
2. CEDIS (Almacén central)
   ↓ Distribution Time (1-3 días según región)
3. CLIENTE FINAL (Walmart, Costco, etc.)
   ↓ Sell-through rate (consumo diario)
4. CONSUMIDOR
```

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- Todas las funcionalidades core implementadas
- Planificación integrada de cadena de suministro
- Visibilidad de clientes finales

### P1 (High Priority) - Pendiente
- Integración real con Google Maps API
- Conexión real con ERP vía API
- Autenticación real con ERP
- Almacenamiento real de documentos

### P2 (Medium Priority)
- Notificaciones push para cambios de estado
- Exportación de reportes PDF
- Multi-idioma (EN/ES)
- Dark mode toggle

### P3 (Low Priority)
- PWA para acceso móvil offline
- Dashboard personalizable
- Alertas por email

## Technical Notes
- **TODOS LOS DATOS SON MOCK** - Generados en Python con random
- Lead times de tránsito configurables en TRANSIT_ROUTES
- Tiempos de distribución por región en DISTRIBUTION_TIMES
- Clientes finales configurables en END_CLIENTS

## Next Tasks
1. Obtener documentación del API del ERP del cliente
2. Configurar Google Maps API key para mapa real
3. Implementar conexión real con endpoints del ERP
4. Configurar almacenamiento de documentos (ERP o cloud)
5. Conectar datos reales de inventario de clientes finales
