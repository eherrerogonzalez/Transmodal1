# Transmodal - Product Requirements Document

## Original Problem Statement
Portal web integral para Transmodal, empresa de logística. La aplicación está destinada a sus clientes y equipo de operaciones interno.

---

## PANTALLA PRINCIPAL UNIFICADA (Nuevo - 19 Feb 2026)

### Acceso Unificado a 4 Plataformas
URL: `/` (raíz del sitio)

Con un solo usuario (`operaciones` / `ops123`) se accede a las 4 plataformas:

| Plataforma | Descripción | Ruta | Color |
|------------|-------------|------|-------|
| **Portal de Cliente** | Pedidos, contenedores, estado de cuenta | `/dashboard` | Azul |
| **Portal de Operaciones** | Rentabilidad, pricing, contratos | `/ops/dashboard` | Gris/Slate |
| **WMS - Almacén** | Inventario, ubicaciones, movimientos | `/wms/dashboard` | Verde/Emerald |
| **Operador de Transporte** | Unidades, rutas, rastreo GPS | `/transport/dashboard` | Naranja/Amber |

### Características:
- Modal de login con colores diferenciados por plataforma
- Credenciales demo visibles
- Diseño oscuro con gradientes y efectos de hover
- Cada plataforma tiene su propio sidebar con colores temáticos

---

### Requerimientos del Producto:
- **Portal de Cliente**: Dashboard con KPIs, gestión de pedidos y seguimiento de contenedores.
- **Logística e IA**:
  - Módulos para pronóstico de llegada de contenedores y gestión de inventarios.
  - Función de IA usando Claude para extraer detalles de pedidos de documentos cargados.
  - Chatbot de IA para consultar datos en tiempo real.
- **Gestión de Patio**: Módulo con cuadrícula visual del patio de contenedores y algoritmo de optimización.
- **Portal de Ejecutivo de Operaciones**: Portal interno con:
  - Dashboard de rentabilidad.
  - **Gestión de Proveedores y Clientes**: Módulos CRUD completos.
  - Estructura de precios de tres niveles:
    1. **Tarifario de Compras**: Catálogo maestro de tarifas por tipo de proveedor (ferrocarril, terminales portuarias, transportistas).
    2. **Tarifario de Pricing**: Costos agregados por ruta (derivados de las tarifas de compra).
    3. **Tarifas Pre-aprobadas**: Servicios empaquetados creados a partir de las tarifas de pricing, con margen de utilidad definido, para uso del equipo comercial.
  - **Módulo de Contratos**: El equipo comercial puede seleccionar una o múltiples tarifas pre-aprobadas para generar un contrato de cliente.
- **Integración ERP**: Objetivo futuro es reemplazar todos los datos mockeados con llamadas API en vivo a su ERP existente.

---

## What's Been Implemented

### Portal de Operaciones (/ops)
**Fecha: 19 Feb 2026**

#### 1. Login de Operaciones
- URL: `/ops/login`
- Credenciales: `operaciones` / `ops123`
- Autenticación con tokens mock

#### 2. Dashboard de Rentabilidad
- KPIs: Ingresos Totales, Costos Totales, Utilidad, Margen
- Gráficos: Tendencia Mensual, Rentabilidad por Cliente
- Listas: Más Rentables, Menos Rentables

#### 3. Módulo de Pricing (`/ops/pricing`)
**Tabs implementados:**

##### a) Compras (Proveedores)
- 7 proveedores configurados con 40 tarifas
- Proveedores: Ferromex, ICAVE Veracruz, CONTECON Manzanillo, APM Terminals Lázaro Cárdenas, Transmodal SPF, Transmodal Distribución, VEREX Transmodal
- Filtros por tipo de proveedor

##### b) Rutas (42 rutas)
- Rutas reales de Veracruz, Manzanillo, Lázaro Cárdenas a CDMX
- Información de costo (min/prom/max), precio venta, margen
- Incluye rutas IMO y con retorno
- Filtros por origen, destino, modo, tamaño de contenedor

##### c) Tarifas Pre-aprobadas
- CRUD completo (Crear, Editar, Duplicar, Eliminar)
- Selección de ruta base del pricing
- Definición de costos con templates predefinidos
- Selección de margen (30%, 25%, 20%, 15%)
- Generación automática de servicios de venta
- Resumen con cálculo de utilidad y margen real

##### d) Servicios Adicionales (12 servicios)
- Catálogo de servicios adicionales
- Costo base y precio sugerido

#### 4. Módulo de Contratos (`/ops/quotes`)
- Formulario de datos del cliente (Nombre, RFC, Email, Teléfono)
- Selección de vigencia (30, 60, 90, 180, 365 días)
- Modal de selección múltiple de tarifas pre-aprobadas
- Resumen del contrato (tarifas incluidas, costo total, precio venta, utilidad, margen)
- Notas/condiciones especiales
- Lista de contratos registrados con filtros

---

## Architecture

### Tech Stack
- **Frontend**: React + Tailwind CSS + Shadcn UI + React Router
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (conexión configurada pero datos mockeados en memoria)

### File Structure
```
/app/
├── backend/
│   ├── server.py           # API endpoints (archivo grande, necesita refactoring)
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ui/         # Shadcn components
│   │   ├── pages/
│   │   │   ├── operations/
│   │   │   │   ├── OpsLayout.jsx
│   │   │   │   ├── OpsLogin.jsx
│   │   │   │   ├── OpsDashboard.jsx
│   │   │   │   ├── OpsPricing.jsx
│   │   │   │   ├── OpsTariffs.jsx
│   │   │   │   ├── OpsPurchases.jsx
│   │   │   │   ├── OpsQuotes.jsx (Contratos)
│   │   │   │   ├── OpsSuppliers.jsx
│   │   │   │   └── OpsClients.jsx
│   │   │   └── ...
│   │   └── App.js
│   └── package.json
└── memory/
    └── PRD.md
```

### Key API Endpoints
```
POST /api/ops/auth/login
GET  /api/ops/pricing/routes
GET  /api/ops/pricing/origins
GET  /api/ops/pricing/destinations
GET  /api/ops/pricing/services
GET  /api/ops/pricing/tariffs
POST /api/ops/pricing/tariffs
PUT  /api/ops/pricing/tariffs/{id}
DELETE /api/ops/pricing/tariffs/{id}
GET  /api/ops/quotes
POST /api/ops/quotes
PUT  /api/ops/quotes/{id}/status
```

---

## Known Issues / Bugs

### P0 - Critical
1. **server.py es demasiado grande** - El archivo tiene 5800+ líneas y causó bugs por colisión de nombres. Necesita refactoring urgente en `/models`, `/routes`, `/services`.

### P2 - Minor
1. **Bug recurrente del sidebar** - A veces el click en el sidebar no navega correctamente (recurrencia: 4 sesiones)
2. **React hydration warnings** - Warnings en consola sobre `<tr>` dentro de `<span>` - no afecta funcionalidad

---

## Pending / Backlog Tasks

### P0 - High Priority
- [ ] **Refactorizar server.py** - Dividir en archivos separados por dominio

### P1 - Medium Priority
- [ ] **Integración ERP** - Conectar con repo privado del usuario
- [ ] **Exportar contratos a PDF** - Generar PDF descargable de contratos
- [ ] **Probar página Orders.jsx** - El formulario de pedidos del portal cliente no está testeado

### P2 - Low Priority
- [ ] **Refactorizar OpsPricing.jsx** - Descomponer componente grande
- [ ] **Integración Google Maps** - Reemplazar placeholder del mapa
- [ ] **Notificaciones por email** - Alertas para eventos críticos
- [ ] **UI de extracción de documentos con IA** - Frontend para la funcionalidad de IA

---

## Testing Status

### Última prueba: 19 Feb 2026
- **Backend**: 100% (18/18 pruebas pasaron)
- **Frontend**: 100% (todas las funcionalidades solicitadas funcionan)
- **Archivo de reporte**: `/app/test_reports/iteration_3.json`

### Credenciales de Prueba
- **Portal de Operaciones**: `/ops`
  - Usuario: `operaciones`
  - Password: `ops123`

---

## Important Notes

### Datos Mockeados
- TODOS los datos están mockeados en memoria
- Las rutas se generan con `generate_route_prices()` 
- Las tarifas se almacenan en `_preapproved_tariffs_cache`
- Los contratos se almacenan en `_quotes_cache`
- **No hay persistencia en base de datos**

### Idioma del Usuario
- El usuario prefiere comunicación en **español**
