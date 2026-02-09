# Transmodal Client Portal - PRD

## Problem Statement
Crear una aplicación donde un cliente de Transmodal pueda:
- Crear órdenes de contenedores
- Subir fotos y documentos a una orden
- Ver el estatus de sus contenedores
- Aprobar adicionales
- Dashboard con KPIs (contenedores movidos, gasto en logística, emisiones CO2)
- Mapa de tracking de contenedores
- Estado de cuenta

## User Personas
- **Cliente Corporativo**: Empresas importadoras/exportadoras que necesitan gestionar sus operaciones de contenedores y logística con Transmodal

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI (Python) con endpoints mock
- **Database**: MongoDB (para órdenes creadas)
- **Auth**: Token JWT simulado (para futura integración con ERP)

## Core Requirements (Static)
1. Autenticación con token del ERP (mock)
2. Dashboard con métricas de operaciones
3. Gestión de órdenes de contenedores
4. Tracking de contenedores en mapa
5. Aprobación de cargos adicionales
6. Estado de cuenta del cliente

## What's Been Implemented ✅
**Date: 2026-02-09**

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

### Frontend (React)
- Login page con imagen de fondo
- Dashboard con 4 KPIs + 3 gráficos (Recharts)
- Órdenes: lista, búsqueda, filtros, crear orden, ver detalle
- Contenedores: tabla con filtros por estado y tipo
- Mapa interactivo con marcadores y leyenda
- Adicionales: aprobar/rechazar con confirmación
- Estado de Cuenta: balance, línea de crédito, transacciones
- Sidebar navigation colapsable
- Responsive design

## Prioritized Backlog

### P0 (Critical) - DONE ✅
- Todas las funcionalidades core implementadas

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

## Next Tasks
1. Obtener documentación del API del ERP del cliente
2. Configurar Google Maps API key para mapa real
3. Implementar conexión real con endpoints del ERP
4. Configurar almacenamiento de documentos (ERP o cloud)
