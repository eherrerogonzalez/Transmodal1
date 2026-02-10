from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import base64
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Transmodal Client Portal API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ==================== MODELS ====================

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class UserInfo(BaseModel):
    id: str
    username: str
    company: str
    email: str

class DashboardData(BaseModel):
    total_containers: int
    containers_in_transit: int
    containers_delivered: int
    total_spent: float
    spent_this_month: float
    total_emissions: float
    emissions_this_month: float
    monthly_data: List[dict]

class TrackingEvent(BaseModel):
    event_name: str
    event_key: str
    scheduled_date: Optional[str] = None
    actual_date: Optional[str] = None
    status: str  # "completed", "in_progress", "pending", "na"
    location: Optional[str] = None
    notes: Optional[str] = None

class ContainerTracking(BaseModel):
    container_id: str
    transport_mode: str  # "maritime", "intermodal_train", "truck"
    events: List[TrackingEvent]

class ContainerLocation(BaseModel):
    container_id: str
    latitude: float
    longitude: float
    status: str
    origin: str
    destination: str
    vessel_name: Optional[str] = None
    eta: Optional[str] = None

class ContainerAdditional(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    reason_code: str
    reason_description: str
    amount: float
    status: str  # "pending", "approved", "rejected"
    requested_at: str
    approved_at: Optional[str] = None

# ==================== PLANNING MODELS ====================

class WarehouseConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    doors: int  # Number of loading docks/doors
    max_containers_per_day: int
    operating_hours: str = "08:00-18:00"
    working_days: List[str] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

class HistoricalData(BaseModel):
    year: int
    month: str
    containers: int
    logistics_cost: float
    extra_costs: float
    avg_cost_per_container: float

class ForecastData(BaseModel):
    month: str
    month_num: int
    forecasted_containers: int
    forecasted_logistics_cost: float
    forecasted_extra_costs: float
    confidence_level: float

class DeliverySlot(BaseModel):
    date: str
    day_name: str
    scheduled_containers: int
    max_capacity: int
    utilization_percent: float
    containers: List[dict]

class PlanningForecast(BaseModel):
    year: int
    historical_summary: dict
    annual_forecast: dict
    monthly_forecast: List[ForecastData]
    delivery_calendar: List[DeliverySlot]
    budget_comparison: dict

# ==================== INVENTORY & PRODUCTS MODELS ====================

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    name: str
    brand: str
    category: str
    unit: str = "cajas"
    units_per_container: int

class InventoryItem(BaseModel):
    product_id: str
    sku: str
    name: str
    brand: str
    current_stock: int
    minimum_stock: int
    maximum_stock: int
    reorder_point: int
    stock_status: str  # "critical", "low", "optimal", "excess"
    days_of_stock: float
    units_needed: int
    priority_score: float  # Higher = more urgent

class ContainerProduct(BaseModel):
    container_id: str
    container_number: str
    product_id: str
    sku: str
    product_name: str
    brand: str
    quantity: int
    eta: str
    status: str
    priority_score: float
    delivery_urgency: str  # "critical", "high", "medium", "low"

class StockReplanishment(BaseModel):
    product_id: str
    sku: str
    product_name: str
    brand: str
    current_stock: int
    minimum_stock: int
    units_needed: int
    containers_in_transit: int
    units_in_transit: int
    expected_stock_after_delivery: int
    priority_score: float
    status: str

# ==================== WAREHOUSE POSITIONS & APPOINTMENTS ====================

class WarehousePosition(BaseModel):
    position_id: str
    zone: str  # A, B, C, D, E
    aisle: str  # 01-20
    rack: str  # 01-10
    level: str  # 1-5
    full_code: str  # Z-AA-RR-L (e.g., A-05-03-2)
    capacity: int
    current_units: int
    product_sku: Optional[str] = None
    product_name: Optional[str] = None
    nearest_door: int

class ProductPositions(BaseModel):
    sku: str
    product_name: str
    brand: str
    total_units: int
    positions: List[WarehousePosition]
    recommended_door: int
    zone_distribution: dict

class DeliveryAppointment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_number: str
    product_sku: str
    product_name: str
    brand: str
    quantity: int
    scheduled_date: str
    scheduled_time: str
    assigned_door: int
    operator_name: str
    operator_license: str
    insurance_policy: str
    truck_plates: str
    status: str  # "scheduled", "in_progress", "completed", "cancelled"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    notes: Optional[str] = None

class NewProductRequest(BaseModel):
    sku: str
    name: str
    brand: str
    category: str
    units_per_container: int
    minimum_stock: int
    maximum_stock: int
    zone_preference: str  # Preferred warehouse zone

# ==================== TRANSIT TIME & RESTOCK PLANNING MODELS ====================

class TransitRoute(BaseModel):
    route_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    origin: str
    destination: str
    transport_mode: str  # maritime, intermodal_train, truck
    transit_days: int
    port_handling_days: int = 2
    customs_days: int = 3
    inland_transport_days: int = 1
    total_lead_time_days: int
    cost_per_container: float
    
class RestockPrediction(BaseModel):
    product_id: str
    sku: str
    product_name: str
    brand: str
    current_stock: int
    minimum_stock: int
    daily_consumption_rate: float
    days_until_stockout: float
    reorder_point_date: str  # When to place order at origin
    expected_delivery_date: str  # When container arrives at CEDIS
    transit_time_days: int
    recommended_quantity: int
    urgency_level: str  # "immediate", "soon", "scheduled", "ok"
    suggested_origin: str
    route_details: dict

# ==================== CLIENT INVENTORY (WALMART, ETC.) MODELS ====================

class EndClientLocation(BaseModel):
    location_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str  # e.g., "Walmart", "Costco", "HEB"
    store_code: str
    store_name: str
    city: str
    state: str
    region: str

class EndClientInventory(BaseModel):
    location_id: str
    client_name: str
    store_code: str
    store_name: str
    sku: str
    product_name: str
    brand: str
    current_stock: int
    sell_through_rate: float  # Units sold per day
    days_of_stock: float
    minimum_stock: int
    reorder_point: int
    needs_restock: bool
    estimated_stockout_date: Optional[str]
    suggested_restock_date: str
    suggested_quantity: int
    priority_score: float

class EndClientSummary(BaseModel):
    client_name: str
    total_locations: int
    products_tracked: int
    locations_needing_restock: int
    critical_stockouts: int
    total_units_to_ship: int

# ==================== SUPPLY CHAIN PLANNING MODEL ====================

class SupplyChainPlan(BaseModel):
    """Planificación integrada de cadena de suministro para evitar desabasto en cliente final"""
    sku: str
    product_name: str
    brand: str
    
    # Estado actual en toda la cadena
    cedis_current_stock: int
    cedis_minimum_stock: int
    cedis_days_of_stock: float
    
    # Demanda agregada de clientes finales
    total_end_client_demand: int  # Unidades que necesitan los clientes finales
    end_clients_needing_restock: int
    critical_end_client_locations: int
    
    # Análisis de capacidad
    can_fulfill_from_cedis: bool  # ¿CEDIS puede surtir la demanda actual?
    cedis_deficit: int  # Unidades faltantes en CEDIS para surtir demanda
    
    # Fechas críticas
    earliest_end_client_stockout: Optional[str]  # Fecha más temprana de desabasto en cliente final
    distribution_ship_by_date: Optional[str]  # Cuándo debe salir de CEDIS
    cedis_reorder_date: Optional[str]  # Cuándo pedir a origen
    expected_inbound_date: Optional[str]  # Cuándo llega el inbound a CEDIS
    
    # Tiempos
    distribution_time_days: int  # CEDIS → Cliente final
    inbound_lead_time_days: int  # Origen → CEDIS
    
    # Acciones recomendadas
    action_required: str  # "none", "distribute", "order_now", "order_soon", "emergency"
    action_description: str
    
    # Detalle de rutas
    suggested_origin: str
    route_details: dict
    
    # Prioridad
    priority_score: float  # 0-100, mayor = más urgente

class DistributionOrder(BaseModel):
    """Orden de distribución de CEDIS a cliente final"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sku: str
    product_name: str
    brand: str
    client_name: str
    store_code: str
    store_name: str
    region: str
    quantity: int
    ship_by_date: str
    expected_arrival: str
    distribution_time_days: int
    priority: str  # "critical", "high", "medium", "low"
    status: str = "pending"  # "pending", "shipped", "delivered"

class Container(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_number: str
    type: str
    size: str
    status: str
    origin: str
    destination: str
    vessel_name: Optional[str] = None
    eta: Optional[str] = None
    latitude: float
    longitude: float
    order_id: Optional[str] = None
    transport_mode: str = "maritime"
    is_invoiced: bool = False
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    has_additionals: bool = False
    additionals_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OrderDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str
    url: str
    uploaded_at: str

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    client_id: str
    origin: str
    destination: str
    container_type: str
    container_size: str
    cargo_description: str
    weight: float
    status: str
    documents: List[OrderDocument] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    estimated_delivery: Optional[str] = None
    total_cost: float = 0.0

class OrderCreate(BaseModel):
    origin: str
    destination: str
    container_type: str
    container_size: str
    cargo_description: str
    weight: float

class Additional(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    order_number: str
    description: str
    amount: float
    status: str
    requested_at: str
    approved_at: Optional[str] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    description: str
    type: str
    amount: float
    balance: float
    order_number: Optional[str] = None

class AccountStatement(BaseModel):
    client_name: str
    account_number: str
    current_balance: float
    credit_limit: float
    available_credit: float
    transactions: List[Transaction]

# ==================== MOCK DATA GENERATION ====================

MOCK_USER = {
    "id": "usr_001",
    "username": "cliente_demo",
    "company": "Importadora Global S.A.",
    "email": "demo@importadoraglobal.com"
}

MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_erp_token"

PORTS = [
    {"name": "Shanghai", "lat": 31.2304, "lng": 121.4737},
    {"name": "Rotterdam", "lat": 51.9225, "lng": 4.4792},
    {"name": "Los Angeles", "lat": 33.7361, "lng": -118.2641},
    {"name": "Singapore", "lat": 1.2644, "lng": 103.8222},
    {"name": "Hamburg", "lat": 53.5511, "lng": 9.9937},
    {"name": "Manzanillo", "lat": 19.0528, "lng": -104.3186},
    {"name": "Veracruz", "lat": 19.1738, "lng": -96.1342},
    {"name": "Lazaro Cardenas", "lat": 17.9583, "lng": -102.1864},
]

CONTAINER_STATUSES = ["En Puerto Origen", "En Tránsito", "En Aduana", "En Puerto Destino", "Entregado"]
CONTAINER_TYPES = ["Dry", "Reefer", "Open Top", "Flat Rack"]
CONTAINER_SIZES = ["20ft", "40ft", "40ft HC", "45ft HC"]
VESSELS = ["MSC Gülsün", "CMA CGM Antoine", "COSCO Shipping Universe", "Maersk Emerald", "Evergreen Ever Given"]
TRANSPORT_MODES = ["maritime", "intermodal_train", "truck"]
CEDIS_LOCATIONS = ["CEDIS Guadalajara", "CEDIS CDMX", "CEDIS Monterrey", "CEDIS Querétaro", "CEDIS Puebla"]
TERMINALS = ["Terminal APM", "Terminal ICAVE", "Terminal SSA", "Terminal Hutchison"]
INTERMODAL_TERMINALS = ["Terminal Intermodal Pantaco", "Terminal Intermodal San Luis Potosí", "Terminal Ferromex GDL"]

# ==================== PERNOD RICARD PRODUCTS ====================

PERNOD_RICARD_PRODUCTS = [
    {"sku": "ABS-750", "name": "Absolut Vodka 750ml", "brand": "Absolut", "category": "Vodka", "units_per_container": 2400},
    {"sku": "ABS-1L", "name": "Absolut Vodka 1L", "brand": "Absolut", "category": "Vodka", "units_per_container": 1800},
    {"sku": "ABS-CITRON", "name": "Absolut Citron 750ml", "brand": "Absolut", "category": "Vodka", "units_per_container": 2400},
    {"sku": "ABS-MANGO", "name": "Absolut Mango 750ml", "brand": "Absolut", "category": "Vodka", "units_per_container": 2400},
    {"sku": "WYB-750", "name": "Wyborowa Vodka 750ml", "brand": "Wyborowa", "category": "Vodka", "units_per_container": 2400},
    {"sku": "WYB-1L", "name": "Wyborowa Vodka 1L", "brand": "Wyborowa", "category": "Vodka", "units_per_container": 1800},
    {"sku": "CHV-12", "name": "Chivas Regal 12 años 750ml", "brand": "Chivas Regal", "category": "Whisky", "units_per_container": 1800},
    {"sku": "CHV-18", "name": "Chivas Regal 18 años 750ml", "brand": "Chivas Regal", "category": "Whisky", "units_per_container": 1200},
    {"sku": "CHV-EXTRA", "name": "Chivas Extra 750ml", "brand": "Chivas Regal", "category": "Whisky", "units_per_container": 1500},
    {"sku": "JC-ESP", "name": "José Cuervo Especial 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 2000},
    {"sku": "JC-TRAD-SLV", "name": "José Cuervo Tradicional Silver 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 1800},
    {"sku": "JC-TRAD-REP", "name": "José Cuervo Tradicional Reposado 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 1800},
    {"sku": "JC-1800-SLV", "name": "1800 Silver 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 1500},
    {"sku": "JC-1800-REP", "name": "1800 Reposado 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 1500},
    {"sku": "JC-1800-ANJ", "name": "1800 Añejo 750ml", "brand": "José Cuervo", "category": "Tequila", "units_per_container": 1200},
    {"sku": "BAC-SUP", "name": "Bacardí Superior 750ml", "brand": "Bacardí", "category": "Ron", "units_per_container": 2400},
    {"sku": "BAC-ORO", "name": "Bacardí Oro 750ml", "brand": "Bacardí", "category": "Ron", "units_per_container": 2400},
    {"sku": "BAC-LIMON", "name": "Bacardí Limón 750ml", "brand": "Bacardí", "category": "Ron", "units_per_container": 2400},
    {"sku": "BAC-8", "name": "Bacardí 8 Años 750ml", "brand": "Bacardí", "category": "Ron", "units_per_container": 1500},
    {"sku": "HAVANA-7", "name": "Havana Club 7 Años 750ml", "brand": "Havana Club", "category": "Ron", "units_per_container": 1500},
    {"sku": "BFTR-750", "name": "Beefeater Gin 750ml", "brand": "Beefeater", "category": "Gin", "units_per_container": 2000},
    {"sku": "BFTR-PINK", "name": "Beefeater Pink 750ml", "brand": "Beefeater", "category": "Gin", "units_per_container": 2000},
    {"sku": "JAMESON", "name": "Jameson Irish Whiskey 750ml", "brand": "Jameson", "category": "Whisky", "units_per_container": 1800},
    {"sku": "BALLANT", "name": "Ballantine's Finest 750ml", "brand": "Ballantine's", "category": "Whisky", "units_per_container": 2000},
]

def generate_cedis_inventory():
    """Generate current inventory with stock levels for CEDIS"""
    inventory = []
    
    for product in PERNOD_RICARD_PRODUCTS:
        # Random stock levels
        min_stock = random.randint(500, 2000)
        max_stock = min_stock * 4
        current_stock = random.randint(int(min_stock * 0.3), int(max_stock * 1.1))
        reorder_point = int(min_stock * 1.5)
        
        # Calculate status and priority
        stock_ratio = current_stock / min_stock if min_stock > 0 else 1
        
        if stock_ratio <= 0.5:
            status = "critical"
            priority = 100 - (stock_ratio * 100)  # Higher priority for lower stock
        elif stock_ratio <= 1.0:
            status = "low"
            priority = 70 - (stock_ratio * 30)
        elif stock_ratio <= 2.0:
            status = "optimal"
            priority = 30 - (stock_ratio * 10)
        else:
            status = "excess"
            priority = 0
        
        # Calculate days of stock (assuming avg daily sales)
        avg_daily_sales = random.randint(20, 100)
        days_of_stock = round(current_stock / avg_daily_sales, 1) if avg_daily_sales > 0 else 999
        
        # Units needed to reach reorder point
        units_needed = max(0, reorder_point - current_stock)
        
        inventory.append(InventoryItem(
            product_id=str(uuid.uuid4()),
            sku=product["sku"],
            name=product["name"],
            brand=product["brand"],
            current_stock=current_stock,
            minimum_stock=min_stock,
            maximum_stock=max_stock,
            reorder_point=reorder_point,
            stock_status=status,
            days_of_stock=days_of_stock,
            units_needed=units_needed,
            priority_score=round(max(0, priority), 1)
        ))
    
    # Sort by priority (highest first)
    inventory.sort(key=lambda x: x.priority_score, reverse=True)
    
    return inventory

def generate_containers_with_products(inventory: List[InventoryItem]):
    """Generate containers with products, prioritizing low stock items"""
    containers = []
    
    # Get products that need restocking (sorted by priority)
    products_needing_stock = [inv for inv in inventory if inv.units_needed > 0]
    products_needing_stock.sort(key=lambda x: x.priority_score, reverse=True)
    
    # Generate containers for high priority products
    for i, inv_item in enumerate(products_needing_stock[:15]):  # Top 15 priority items
        product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == inv_item.sku), None)
        if not product:
            continue
        
        origin_port = random.choice(PORTS)
        dest_port = random.choice([p for p in PORTS if p["name"] in ["Manzanillo", "Veracruz", "Lazaro Cardenas"]])
        
        # Higher priority = closer to delivery
        if inv_item.priority_score >= 70:
            status = random.choice(["En Puerto Destino", "En Aduana", "En Tránsito"])
            urgency = "critical"
        elif inv_item.priority_score >= 40:
            status = random.choice(["En Tránsito", "En Aduana"])
            urgency = "high"
        else:
            status = random.choice(["En Puerto Origen", "En Tránsito"])
            urgency = "medium"
        
        eta_days = random.randint(1, 5) if urgency == "critical" else random.randint(5, 15)
        eta = (datetime.now(timezone.utc) + timedelta(days=eta_days)).isoformat()
        
        containers.append(ContainerProduct(
            container_id=str(uuid.uuid4()),
            container_number=generate_container_number(),
            product_id=inv_item.product_id,
            sku=inv_item.sku,
            product_name=inv_item.name,
            brand=inv_item.brand,
            quantity=product["units_per_container"],
            eta=eta,
            status=status,
            priority_score=inv_item.priority_score,
            delivery_urgency=urgency
        ))
    
    # Sort by priority
    containers.sort(key=lambda x: x.priority_score, reverse=True)
    
    return containers

# ==================== WAREHOUSE ZONE CONFIGURATION ====================

WAREHOUSE_ZONES = {
    "A": {"name": "Zona A - Vodkas", "door_range": [1, 2], "categories": ["Vodka"]},
    "B": {"name": "Zona B - Whiskies", "door_range": [2, 3], "categories": ["Whisky"]},
    "C": {"name": "Zona C - Tequilas", "door_range": [4, 5], "categories": ["Tequila"]},
    "D": {"name": "Zona D - Rones", "door_range": [5, 6], "categories": ["Ron"]},
    "E": {"name": "Zona E - Ginebras y Otros", "door_range": [7, 8], "categories": ["Gin", "Otros"]},
}

# ==================== TRANSIT ROUTES CONFIGURATION ====================

TRANSIT_ROUTES = [
    {"origin": "Shanghai", "destination": "Manzanillo", "mode": "maritime", "transit_days": 25, "port_days": 3, "customs_days": 4, "inland_days": 2, "cost": 4500},
    {"origin": "Rotterdam", "destination": "Veracruz", "mode": "maritime", "transit_days": 18, "port_days": 2, "customs_days": 3, "inland_days": 2, "cost": 3800},
    {"origin": "Hamburg", "destination": "Veracruz", "mode": "maritime", "transit_days": 20, "port_days": 2, "customs_days": 3, "inland_days": 2, "cost": 4000},
    {"origin": "Los Angeles", "destination": "CDMX", "mode": "intermodal_train", "transit_days": 8, "port_days": 1, "customs_days": 2, "inland_days": 3, "cost": 2800},
    {"origin": "Singapore", "destination": "Lazaro Cardenas", "mode": "maritime", "transit_days": 28, "port_days": 3, "customs_days": 4, "inland_days": 2, "cost": 4800},
    {"origin": "Miami", "destination": "Veracruz", "mode": "maritime", "transit_days": 5, "port_days": 1, "customs_days": 2, "inland_days": 1, "cost": 2200},
]

def get_transit_route(origin: str = None):
    """Get transit route info - random if no origin specified"""
    if origin:
        route = next((r for r in TRANSIT_ROUTES if r["origin"] == origin), None)
        if route:
            total_lead_time = route["transit_days"] + route["port_days"] + route["customs_days"] + route["inland_days"]
            return {**route, "total_lead_time": total_lead_time}
    route = random.choice(TRANSIT_ROUTES)
    total_lead_time = route["transit_days"] + route["port_days"] + route["customs_days"] + route["inland_days"]
    return {**route, "total_lead_time": total_lead_time}

# ==================== END CLIENT (WALMART, COSTCO, ETC.) CONFIGURATION ====================

END_CLIENTS = [
    {"name": "Walmart", "code_prefix": "WMT", "regions": ["Norte", "Centro", "Sur", "Occidente"], "stores_per_region": 8},
    {"name": "Costco", "code_prefix": "CST", "regions": ["Norte", "Centro", "Occidente"], "stores_per_region": 4},
    {"name": "HEB", "code_prefix": "HEB", "regions": ["Norte", "Noreste"], "stores_per_region": 6},
    {"name": "Soriana", "code_prefix": "SOR", "regions": ["Norte", "Centro", "Sur"], "stores_per_region": 5},
    {"name": "La Comer", "code_prefix": "LCM", "regions": ["Centro"], "stores_per_region": 4},
    {"name": "Chedraui", "code_prefix": "CHD", "regions": ["Sur", "Centro", "Golfo"], "stores_per_region": 5},
]

END_CLIENT_CITIES = {
    "Norte": ["Monterrey", "Saltillo", "Torreón", "Chihuahua"],
    "Noreste": ["Monterrey", "Reynosa", "Matamoros", "Nuevo Laredo"],
    "Centro": ["CDMX", "Toluca", "Querétaro", "Puebla"],
    "Sur": ["Oaxaca", "Tuxtla", "Mérida", "Villahermosa"],
    "Occidente": ["Guadalajara", "León", "Aguascalientes", "Morelia"],
    "Golfo": ["Veracruz", "Coatzacoalcos", "Tampico", "Xalapa"],
}

# Tiempos de distribución desde CEDIS a cada región (en días)
DISTRIBUTION_TIMES = {
    "Norte": 2,      # CEDIS → Monterrey, etc.
    "Noreste": 2,
    "Centro": 1,     # CEDIS está en centro
    "Sur": 3,
    "Occidente": 1,
    "Golfo": 2,
}

def get_distribution_time(region: str) -> int:
    """Get distribution time from CEDIS to a region"""
    return DISTRIBUTION_TIMES.get(region, 2)

def generate_end_client_inventory(client_name: str = None):
    """Generate inventory data for end clients (retailers)"""
    inventory_data = []
    
    clients_to_process = END_CLIENTS if not client_name else [c for c in END_CLIENTS if c["name"] == client_name]
    
    for client in clients_to_process:
        location_counter = 1
        for region in client["regions"]:
            cities = END_CLIENT_CITIES.get(region, ["Ciudad"])
            for _ in range(client["stores_per_region"]):
                city = random.choice(cities)
                store_code = f"{client['code_prefix']}-{location_counter:03d}"
                store_name = f"{client['name']} {city} {location_counter}"
                
                # Generate inventory for selected products at this location
                products_at_store = random.sample(PERNOD_RICARD_PRODUCTS, min(8, len(PERNOD_RICARD_PRODUCTS)))
                
                for product in products_at_store:
                    # Simulate different stock levels at retail
                    min_stock = random.randint(20, 100)
                    current_stock = random.randint(0, int(min_stock * 2.5))
                    sell_through = round(random.uniform(2, 15), 1)  # Units per day
                    days_of_stock = round(current_stock / sell_through, 1) if sell_through > 0 else 999
                    reorder_point = int(min_stock * 1.2)
                    
                    needs_restock = current_stock < reorder_point
                    
                    # Calculate estimated stockout and restock dates
                    stockout_date = None
                    if days_of_stock < 999 and current_stock > 0:
                        stockout_date = (datetime.now(timezone.utc) + timedelta(days=days_of_stock)).strftime("%Y-%m-%d")
                    
                    # Suggested restock: 3 days before stockout or now if critical
                    restock_buffer = max(0, days_of_stock - 3)
                    suggested_restock = (datetime.now(timezone.utc) + timedelta(days=restock_buffer)).strftime("%Y-%m-%d")
                    
                    # Priority score based on days of stock
                    if days_of_stock <= 3:
                        priority = 100
                    elif days_of_stock <= 7:
                        priority = 80
                    elif days_of_stock <= 14:
                        priority = 50
                    else:
                        priority = 20
                    
                    suggested_qty = max(0, reorder_point - current_stock + int(sell_through * 14))  # 2 weeks supply
                    
                    inventory_data.append(EndClientInventory(
                        location_id=str(uuid.uuid4()),
                        client_name=client["name"],
                        store_code=store_code,
                        store_name=store_name,
                        sku=product["sku"],
                        product_name=product["name"],
                        brand=product.get("brand", "Sin marca"),
                        current_stock=current_stock,
                        sell_through_rate=sell_through,
                        days_of_stock=days_of_stock,
                        minimum_stock=min_stock,
                        reorder_point=reorder_point,
                        needs_restock=needs_restock,
                        estimated_stockout_date=stockout_date,
                        suggested_restock_date=suggested_restock,
                        suggested_quantity=suggested_qty,
                        priority_score=priority
                    ))
                
                location_counter += 1
    
    return inventory_data

def generate_restock_predictions(inventory: List[InventoryItem]):
    """Generate predictions for when to order from origin based on transit time"""
    predictions = []
    
    for item in inventory:
        # Calculate daily consumption based on days_of_stock and current_stock
        daily_consumption = item.current_stock / item.days_of_stock if item.days_of_stock > 0 and item.days_of_stock < 999 else 50
        
        # Get route info for this product
        route = get_transit_route()
        lead_time = route["total_lead_time"]
        
        # Calculate when stock hits minimum
        days_until_min = (item.current_stock - item.minimum_stock) / daily_consumption if daily_consumption > 0 else 999
        
        # Reorder point: must order lead_time days before hitting minimum
        days_until_reorder = max(0, days_until_min - lead_time)
        
        # Determine urgency
        if days_until_reorder <= 0:
            urgency = "immediate"
        elif days_until_reorder <= 7:
            urgency = "soon"
        elif days_until_reorder <= 14:
            urgency = "scheduled"
        else:
            urgency = "ok"
        
        reorder_date = datetime.now(timezone.utc) + timedelta(days=days_until_reorder)
        delivery_date = reorder_date + timedelta(days=lead_time)
        
        product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == item.sku), None)
        recommended_qty = product["units_per_container"] if product else 1500
        
        predictions.append(RestockPrediction(
            product_id=item.product_id,
            sku=item.sku,
            product_name=item.name,
            brand=item.brand,
            current_stock=item.current_stock,
            minimum_stock=item.minimum_stock,
            daily_consumption_rate=round(daily_consumption, 1),
            days_until_stockout=round(days_until_min, 1),
            reorder_point_date=reorder_date.strftime("%Y-%m-%d"),
            expected_delivery_date=delivery_date.strftime("%Y-%m-%d"),
            transit_time_days=lead_time,
            recommended_quantity=recommended_qty,
            urgency_level=urgency,
            suggested_origin=route["origin"],
            route_details={
                "origin": route["origin"],
                "destination": route["destination"],
                "transport_mode": route["mode"],
                "transit_days": route["transit_days"],
                "port_handling_days": route["port_days"],
                "customs_days": route["customs_days"],
                "inland_transport_days": route["inland_days"],
                "total_lead_time": lead_time,
                "estimated_cost": route["cost"]
            }
        ))
    
    # Sort by urgency and days until reorder
    urgency_order = {"immediate": 0, "soon": 1, "scheduled": 2, "ok": 3}
    predictions.sort(key=lambda x: (urgency_order.get(x.urgency_level, 4), x.days_until_stockout))
    
    return predictions

def generate_supply_chain_plan():
    """
    Genera planificación integrada de cadena de suministro:
    ORIGEN → INBOUND → CEDIS → DISTRIBUCIÓN → CLIENTE FINAL
    
    El objetivo es que el cliente final NUNCA se quede sin producto.
    """
    plans = []
    
    # Obtener inventario de CEDIS
    cedis_inventory = generate_cedis_inventory()
    cedis_by_sku = {item.sku: item for item in cedis_inventory}
    
    # Obtener demanda de todos los clientes finales
    all_end_client_inventory = generate_end_client_inventory()
    
    # Agrupar demanda por SKU
    demand_by_sku = {}
    for item in all_end_client_inventory:
        if item.sku not in demand_by_sku:
            demand_by_sku[item.sku] = {
                "total_demand": 0,
                "locations_needing": 0,
                "critical_locations": 0,
                "earliest_stockout": None,
                "items": []
            }
        
        if item.needs_restock:
            demand_by_sku[item.sku]["total_demand"] += item.suggested_quantity
            demand_by_sku[item.sku]["locations_needing"] += 1
            
            if item.days_of_stock <= 3:
                demand_by_sku[item.sku]["critical_locations"] += 1
            
            # Track earliest stockout
            if item.estimated_stockout_date:
                current_earliest = demand_by_sku[item.sku]["earliest_stockout"]
                if not current_earliest or item.estimated_stockout_date < current_earliest:
                    demand_by_sku[item.sku]["earliest_stockout"] = item.estimated_stockout_date
            
            demand_by_sku[item.sku]["items"].append(item)
    
    # Generar plan para cada SKU
    for product in PERNOD_RICARD_PRODUCTS:
        sku = product["sku"]
        cedis_item = cedis_by_sku.get(sku)
        demand_info = demand_by_sku.get(sku, {"total_demand": 0, "locations_needing": 0, "critical_locations": 0, "earliest_stockout": None, "items": []})
        
        if not cedis_item:
            continue
        
        # Calcular si CEDIS puede surtir la demanda
        total_demand = demand_info["total_demand"]
        can_fulfill = cedis_item.current_stock >= total_demand
        deficit = max(0, total_demand - cedis_item.current_stock)
        
        # Obtener ruta de tránsito
        route = get_transit_route()
        inbound_lead_time = route["total_lead_time"]
        
        # Calcular tiempo de distribución promedio
        avg_distribution_time = 2  # días promedio CEDIS → cliente final
        
        # Fechas críticas
        earliest_stockout = demand_info["earliest_stockout"]
        today = datetime.now(timezone.utc).date()
        
        # Cuándo debe salir de CEDIS para evitar desabasto
        ship_by_date = None
        if earliest_stockout:
            stockout_date = datetime.strptime(earliest_stockout, "%Y-%m-%d").date()
            ship_by = stockout_date - timedelta(days=avg_distribution_time)
            ship_by_date = ship_by.strftime("%Y-%m-%d")
        
        # Cuándo pedir a origen
        cedis_reorder_date = None
        expected_inbound = None
        if not can_fulfill or cedis_item.stock_status in ["critical", "low"]:
            # Necesita inbound - calcular fecha de pedido
            if ship_by_date:
                ship_by = datetime.strptime(ship_by_date, "%Y-%m-%d").date()
                reorder_date = ship_by - timedelta(days=inbound_lead_time)
                cedis_reorder_date = max(today, reorder_date).strftime("%Y-%m-%d")
                expected_inbound = (datetime.strptime(cedis_reorder_date, "%Y-%m-%d").date() + timedelta(days=inbound_lead_time)).strftime("%Y-%m-%d")
            else:
                # No hay stockout inmediato, pero CEDIS está bajo
                days_until_cedis_min = (cedis_item.current_stock - cedis_item.minimum_stock) / (cedis_item.current_stock / cedis_item.days_of_stock) if cedis_item.days_of_stock > 0 else 30
                reorder_date = today + timedelta(days=max(0, days_until_cedis_min - inbound_lead_time))
                cedis_reorder_date = reorder_date.strftime("%Y-%m-%d")
                expected_inbound = (reorder_date + timedelta(days=inbound_lead_time)).strftime("%Y-%m-%d")
        
        # Determinar acción requerida
        if demand_info["critical_locations"] > 0 and not can_fulfill:
            action = "emergency"
            action_desc = f"🚨 EMERGENCIA: {demand_info['critical_locations']} ubicaciones críticas y CEDIS no puede surtir. Pedir a origen INMEDIATAMENTE."
            priority = 100
        elif demand_info["critical_locations"] > 0:
            action = "distribute"
            action_desc = f"⚠️ DISTRIBUIR YA: {demand_info['critical_locations']} ubicaciones en estado crítico. Stock en CEDIS suficiente."
            priority = 90
        elif not can_fulfill and demand_info["locations_needing"] > 0:
            action = "order_now"
            action_desc = f"📦 PEDIR A ORIGEN: Déficit de {deficit:,} unidades para surtir {demand_info['locations_needing']} ubicaciones."
            priority = 80
        elif cedis_item.stock_status == "critical":
            action = "order_now"
            action_desc = f"📦 PEDIR A ORIGEN: Stock CEDIS crítico ({cedis_item.days_of_stock:.1f} días)."
            priority = 75
        elif cedis_item.stock_status == "low" or demand_info["locations_needing"] > 5:
            action = "order_soon"
            action_desc = f"📋 PROGRAMAR PEDIDO: Stock bajo en CEDIS o múltiples ubicaciones necesitan restock."
            priority = 50
        elif demand_info["locations_needing"] > 0:
            action = "distribute"
            action_desc = f"🚚 PLANIFICAR DISTRIBUCIÓN: {demand_info['locations_needing']} ubicaciones necesitan resurtido."
            priority = 40
        else:
            action = "none"
            action_desc = "✅ Cadena de suministro saludable. No se requiere acción inmediata."
            priority = 10
        
        plans.append(SupplyChainPlan(
            sku=sku,
            product_name=product["name"],
            brand=product.get("brand", "Sin marca"),
            cedis_current_stock=cedis_item.current_stock,
            cedis_minimum_stock=cedis_item.minimum_stock,
            cedis_days_of_stock=cedis_item.days_of_stock,
            total_end_client_demand=total_demand,
            end_clients_needing_restock=demand_info["locations_needing"],
            critical_end_client_locations=demand_info["critical_locations"],
            can_fulfill_from_cedis=can_fulfill,
            cedis_deficit=deficit,
            earliest_end_client_stockout=earliest_stockout,
            distribution_ship_by_date=ship_by_date,
            cedis_reorder_date=cedis_reorder_date,
            expected_inbound_date=expected_inbound,
            distribution_time_days=avg_distribution_time,
            inbound_lead_time_days=inbound_lead_time,
            action_required=action,
            action_description=action_desc,
            suggested_origin=route["origin"],
            route_details={
                "origin": route["origin"],
                "destination": route["destination"],
                "transport_mode": route["mode"],
                "transit_days": route["transit_days"],
                "total_lead_time": inbound_lead_time,
                "cost": route["cost"]
            },
            priority_score=priority
        ))
    
    # Ordenar por prioridad
    plans.sort(key=lambda x: x.priority_score, reverse=True)
    return plans

def generate_distribution_orders():
    """Genera órdenes de distribución pendientes desde CEDIS a clientes finales"""
    orders = []
    
    cedis_inventory = generate_cedis_inventory()
    cedis_by_sku = {item.sku: item for item in cedis_inventory}
    
    all_end_client_inventory = generate_end_client_inventory()
    
    for item in all_end_client_inventory:
        if not item.needs_restock:
            continue
        
        cedis_item = cedis_by_sku.get(item.sku)
        if not cedis_item or cedis_item.current_stock < item.suggested_quantity:
            continue  # No hay stock en CEDIS para surtir
        
        # Determinar región y tiempo de distribución
        region = "Centro"  # Default
        for client in END_CLIENTS:
            if client["name"] == item.client_name:
                for r in client["regions"]:
                    region = r
                    break
                break
        
        dist_time = get_distribution_time(region)
        
        # Calcular fechas
        ship_by = datetime.strptime(item.suggested_restock_date, "%Y-%m-%d").date()
        arrival = ship_by + timedelta(days=dist_time)
        
        # Prioridad
        if item.days_of_stock <= 3:
            priority = "critical"
        elif item.days_of_stock <= 7:
            priority = "high"
        elif item.days_of_stock <= 14:
            priority = "medium"
        else:
            priority = "low"
        
        product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == item.sku), None)
        
        orders.append(DistributionOrder(
            sku=item.sku,
            product_name=item.product_name,
            brand=item.brand,
            client_name=item.client_name,
            store_code=item.store_code,
            store_name=item.store_name,
            region=region,
            quantity=item.suggested_quantity,
            ship_by_date=ship_by.strftime("%Y-%m-%d"),
            expected_arrival=arrival.strftime("%Y-%m-%d"),
            distribution_time_days=dist_time,
            priority=priority
        ))
    
    # Ordenar por prioridad y fecha
    priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    orders.sort(key=lambda x: (priority_order.get(x.priority, 4), x.ship_by_date))
    
    return orders

def get_zone_for_category(category: str) -> str:
    """Get warehouse zone for a product category"""
    for zone, config in WAREHOUSE_ZONES.items():
        if category in config["categories"]:
            return zone
    return "E"  # Default zone

def get_recommended_door(zone: str) -> int:
    """Get recommended door based on zone"""
    if zone in WAREHOUSE_ZONES:
        doors = WAREHOUSE_ZONES[zone]["door_range"]
        return random.choice(doors)
    return random.randint(1, 8)

def generate_warehouse_positions(sku: str, product_name: str, category: str, total_units: int):
    """Generate warehouse positions for a product"""
    zone = get_zone_for_category(category)
    positions = []
    remaining_units = total_units
    position_capacity = random.randint(200, 500)
    
    aisle_num = 1
    rack_num = 1
    level_num = 1
    
    while remaining_units > 0:
        units_in_position = min(remaining_units, position_capacity)
        
        position = WarehousePosition(
            position_id=str(uuid.uuid4()),
            zone=zone,
            aisle=f"{aisle_num:02d}",
            rack=f"{rack_num:02d}",
            level=str(level_num),
            full_code=f"{zone}-{aisle_num:02d}-{rack_num:02d}-{level_num}",
            capacity=position_capacity,
            current_units=units_in_position,
            product_sku=sku,
            product_name=product_name,
            nearest_door=get_recommended_door(zone)
        )
        positions.append(position)
        
        remaining_units -= units_in_position
        level_num += 1
        if level_num > 5:
            level_num = 1
            rack_num += 1
        if rack_num > 10:
            rack_num = 1
            aisle_num += 1
    
    return positions, zone

# Additional types with reason codes
ADDITIONAL_TYPES = [
    {"type": "DEMORA", "code": "DEM001", "description": "Demora en puerto - día adicional"},
    {"type": "DEMORA", "code": "DEM002", "description": "Demora en terminal intermodal"},
    {"type": "DEMORA", "code": "DEM003", "description": "Demora por inspección aduanal"},
    {"type": "ALMACENAJE", "code": "ALM001", "description": "Almacenaje extendido en puerto"},
    {"type": "ALMACENAJE", "code": "ALM002", "description": "Almacenaje en terminal destino"},
    {"type": "ALMACENAJE", "code": "ALM003", "description": "Almacenaje en CEDIS"},
    {"type": "MANIOBRA", "code": "MAN001", "description": "Maniobra especial de carga"},
    {"type": "MANIOBRA", "code": "MAN002", "description": "Maniobra de descarga con grúa"},
    {"type": "MANIOBRA", "code": "MAN003", "description": "Volteo de contenedor"},
    {"type": "INSPECCION", "code": "INS001", "description": "Inspección aduanal adicional"},
    {"type": "INSPECCION", "code": "INS002", "description": "Fumigación de contenedor"},
    {"type": "INSPECCION", "code": "INS003", "description": "Revisión fitosanitaria"},
    {"type": "TRANSPORTE", "code": "TRA001", "description": "Transporte terrestre urgente"},
    {"type": "TRANSPORTE", "code": "TRA002", "description": "Cambio de ruta de entrega"},
    {"type": "TRANSPORTE", "code": "TRA003", "description": "Entrega en horario especial"},
    {"type": "SEGURO", "code": "SEG001", "description": "Seguro adicional de carga"},
    {"type": "SEGURO", "code": "SEG002", "description": "Cobertura por daños"},
    {"type": "DOCUMENTACION", "code": "DOC001", "description": "Gestión documental adicional"},
    {"type": "DOCUMENTACION", "code": "DOC002", "description": "Corrección de BL"},
]

def generate_container_additionals(container_id: str, count: int = None):
    """Generate random additionals for a container"""
    if count is None:
        count = random.randint(0, 4)
    
    if count == 0:
        return []
    
    additionals = []
    selected_types = random.sample(ADDITIONAL_TYPES, min(count, len(ADDITIONAL_TYPES)))
    
    for add_type in selected_types:
        status = random.choice(["pending", "pending", "approved", "rejected"])
        requested_at = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 10))
        
        additionals.append(ContainerAdditional(
            type=add_type["type"],
            reason_code=add_type["code"],
            reason_description=add_type["description"],
            amount=round(random.uniform(150, 3500), 2),
            status=status,
            requested_at=requested_at.isoformat(),
            approved_at=(requested_at + timedelta(days=random.randint(1, 3))).isoformat() if status == "approved" else None
        ))
    
    return additionals

def generate_tracking_events(container_status: str, transport_mode: str):
    """Generate realistic tracking events based on container status and transport mode"""
    
    base_date = datetime.now(timezone.utc) - timedelta(days=random.randint(5, 20))
    events = []
    
    # Define all possible events
    all_events = [
        ("Atraque de Buque", "vessel_arrival"),
        ("Solicitud Agente Aduanal", "customs_request"),
        ("Salida de Terminal", "terminal_departure"),
        ("Llegada Terminal Intermodal", "intermodal_arrival"),
        ("Salida Terminal Intermodal", "intermodal_departure"),
        ("Cita Llegada CEDIS", "cedis_appointment"),
        ("Llegada a CEDIS", "cedis_arrival"),
        ("Salida de Almacén", "warehouse_departure"),
        ("Entrega de Vacío", "empty_return")
    ]
    
    # Determine which events are applicable based on transport mode
    if transport_mode == "intermodal_train":
        applicable_events = all_events
    else:
        # Skip intermodal events for direct truck/maritime
        applicable_events = [e for e in all_events if "intermodal" not in e[1]]
    
    # Determine completed events based on status
    status_progress = {
        "En Puerto Origen": 0,
        "En Tránsito": 2,
        "En Aduana": 3,
        "En Puerto Destino": 4,
        "En Terminal Intermodal": 5,
        "En Tránsito Terrestre": 6,
        "En CEDIS": 7,
        "Entregado": len(applicable_events)
    }
    
    completed_count = status_progress.get(container_status, 2)
    now = datetime.now(timezone.utc)
    
    for i, (event_name, event_key) in enumerate(applicable_events):
        # Calculate dates based on position in timeline
        scheduled_date = base_date + timedelta(days=i * random.randint(1, 3), hours=random.randint(0, 12))
        
        # Determine status based on dates and position
        if i < completed_count:
            # Past events - completed
            actual_date = scheduled_date + timedelta(hours=random.randint(-2, 6))
            if actual_date > now:
                actual_date = now - timedelta(hours=random.randint(1, 12))
            status = "completed"
            actual_date_str = actual_date.isoformat()
            scheduled_date_str = scheduled_date.isoformat()
        elif i == completed_count:
            # Current event - in progress
            status = "in_progress"
            actual_date_str = None
            # Scheduled for near future
            scheduled_date = now + timedelta(hours=random.randint(1, 48))
            scheduled_date_str = scheduled_date.isoformat()
        else:
            # Future events - pending
            status = "pending"
            actual_date_str = None
            # Scheduled for future
            scheduled_date = now + timedelta(days=i - completed_count + 1, hours=random.randint(0, 12))
            scheduled_date_str = scheduled_date.isoformat()
        
        # Add location info
        if "terminal" in event_key.lower() and "intermodal" not in event_key:
            location = random.choice(TERMINALS)
        elif "intermodal" in event_key:
            location = random.choice(INTERMODAL_TERMINALS)
        elif "cedis" in event_key.lower() or "warehouse" in event_key.lower():
            location = random.choice(CEDIS_LOCATIONS)
        else:
            location = None
        
        events.append(TrackingEvent(
            event_name=event_name,
            event_key=event_key,
            scheduled_date=scheduled_date_str,
            actual_date=actual_date_str,
            status=status,
            location=location,
            notes=f"Referencia: REF-{random.randint(10000, 99999)}" if status == "completed" else None
        ))
    
    return events

def generate_container_number():
    prefix = random.choice(["MSKU", "CSQU", "CMAU", "MSCU", "EGLV"])
    numbers = ''.join([str(random.randint(0, 9)) for _ in range(7)])
    return f"{prefix}{numbers}"

def generate_order_number():
    return f"TM-{datetime.now().year}-{random.randint(10000, 99999)}"

# ==================== AUTH HELPERS ====================

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials.credentials:
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    # In production, this would verify against the ERP
    return MOCK_USER

# ==================== ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "Transmodal Client Portal API", "version": "1.0.0"}

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Simulate ERP authentication - returns mock token"""
    # In production, this would call the ERP API
    if request.username and request.password:
        return LoginResponse(
            token=MOCK_TOKEN,
            user=MOCK_USER
        )
    raise HTTPException(status_code=401, detail="Credenciales inválidas")

@api_router.get("/auth/me", response_model=UserInfo)
async def get_current_user(user: dict = Depends(verify_token)):
    """Get current user info"""
    return UserInfo(**user)

@api_router.get("/dashboard", response_model=DashboardData)
async def get_dashboard(user: dict = Depends(verify_token)):
    """Get dashboard KPIs and charts data"""
    # Generate realistic monthly data
    months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    monthly_data = []
    for i, month in enumerate(months[:12]):
        containers = random.randint(15, 45)
        spent = round(random.uniform(25000, 75000), 2)
        emissions = round(containers * random.uniform(2.1, 3.5), 2)
        monthly_data.append({
            "month": month,
            "containers": containers,
            "spent": spent,
            "emissions": emissions
        })
    
    return DashboardData(
        total_containers=sum(d["containers"] for d in monthly_data),
        containers_in_transit=random.randint(8, 20),
        containers_delivered=random.randint(200, 350),
        total_spent=sum(d["spent"] for d in monthly_data),
        spent_this_month=monthly_data[-1]["spent"],
        total_emissions=sum(d["emissions"] for d in monthly_data),
        emissions_this_month=monthly_data[-1]["emissions"],
        monthly_data=monthly_data
    )

@api_router.get("/containers", response_model=List[Container])
async def get_containers(user: dict = Depends(verify_token)):
    """Get all containers for the client"""
    containers = []
    for i in range(random.randint(10, 20)):
        origin_port = random.choice(PORTS)
        dest_port = random.choice([p for p in PORTS if p != origin_port])
        status = random.choice(CONTAINER_STATUSES)
        transport_mode = random.choice(TRANSPORT_MODES)
        
        # Calculate position based on status
        if status == "En Puerto Origen":
            lat, lng = origin_port["lat"], origin_port["lng"]
        elif status == "Entregado" or status == "En Puerto Destino":
            lat, lng = dest_port["lat"], dest_port["lng"]
        else:
            # In transit - random position between origin and destination
            progress = random.uniform(0.2, 0.8)
            lat = origin_port["lat"] + (dest_port["lat"] - origin_port["lat"]) * progress
            lng = origin_port["lng"] + (dest_port["lng"] - origin_port["lng"]) * progress
        
        # Determine if invoiced (delivered containers are usually invoiced)
        is_invoiced = status == "Entregado" or (status == "En Puerto Destino" and random.random() > 0.5)
        invoice_date = (datetime.now(timezone.utc) - timedelta(days=random.randint(1, 5))).isoformat() if is_invoiced else None
        
        # Determine if has additionals
        has_additionals = random.random() > 0.6
        additionals_count = random.randint(1, 4) if has_additionals else 0
        
        containers.append(Container(
            container_number=generate_container_number(),
            type=random.choice(CONTAINER_TYPES),
            size=random.choice(CONTAINER_SIZES),
            status=status,
            origin=origin_port["name"],
            destination=dest_port["name"],
            vessel_name=random.choice(VESSELS) if status == "En Tránsito" else None,
            eta=(datetime.now(timezone.utc).isoformat() if status != "Entregado" else None),
            latitude=lat,
            longitude=lng,
            transport_mode=transport_mode,
            is_invoiced=is_invoiced,
            invoice_number=f"FAC-{random.randint(100000, 999999)}" if is_invoiced else None,
            invoice_date=invoice_date,
            has_additionals=has_additionals,
            additionals_count=additionals_count
        ))
    return containers

@api_router.get("/containers/{container_id}", response_model=Container)
async def get_container(container_id: str, user: dict = Depends(verify_token)):
    """Get single container details"""
    origin_port = random.choice(PORTS)
    dest_port = random.choice([p for p in PORTS if p != origin_port])
    status = random.choice(CONTAINER_STATUSES)
    
    return Container(
        id=container_id,
        container_number=generate_container_number(),
        type=random.choice(CONTAINER_TYPES),
        size=random.choice(CONTAINER_SIZES),
        status=status,
        origin=origin_port["name"],
        destination=dest_port["name"],
        vessel_name=random.choice(VESSELS),
        eta=datetime.now(timezone.utc).isoformat(),
        latitude=origin_port["lat"],
        longitude=origin_port["lng"],
        transport_mode=random.choice(TRANSPORT_MODES)
    )

@api_router.get("/containers/{container_id}/tracking", response_model=ContainerTracking)
async def get_container_tracking(container_id: str, user: dict = Depends(verify_token)):
    """Get detailed tracking timeline for a container"""
    status = random.choice(CONTAINER_STATUSES)
    transport_mode = random.choice(TRANSPORT_MODES)
    
    events = generate_tracking_events(status, transport_mode)
    
    return ContainerTracking(
        container_id=container_id,
        transport_mode=transport_mode,
        events=events
    )

@api_router.get("/containers/{container_id}/additionals", response_model=List[ContainerAdditional])
async def get_container_additionals(container_id: str, user: dict = Depends(verify_token)):
    """Get additionals for a specific container with reason codes"""
    count = random.randint(1, 5)
    return generate_container_additionals(container_id, count)

# ==================== PLANNING ENDPOINTS ====================

def generate_historical_data(years: int = 3):
    """Generate historical data for the past years"""
    months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    current_year = datetime.now().year
    historical = []
    
    # Base values that grow slightly each year
    base_containers = 25
    base_cost = 4500
    extra_cost_ratio = 0.12  # 12% extra costs on average
    
    for year_offset in range(years, 0, -1):
        year = current_year - year_offset
        growth_factor = 1 + (years - year_offset) * 0.08  # 8% annual growth
        
        for month_idx, month in enumerate(months):
            # Seasonal variation - more containers in Q4
            seasonal_factor = 1.0
            if month_idx >= 9:  # Oct-Dec
                seasonal_factor = 1.3
            elif month_idx >= 6:  # Jul-Sep
                seasonal_factor = 1.1
            elif month_idx <= 1:  # Jan-Feb
                seasonal_factor = 0.85
            
            containers = int(base_containers * growth_factor * seasonal_factor * random.uniform(0.9, 1.1))
            logistics_cost = round(containers * base_cost * random.uniform(0.95, 1.05), 2)
            extra_costs = round(logistics_cost * extra_cost_ratio * random.uniform(0.8, 1.4), 2)
            
            historical.append(HistoricalData(
                year=year,
                month=month,
                containers=containers,
                logistics_cost=logistics_cost,
                extra_costs=extra_costs,
                avg_cost_per_container=round(logistics_cost / containers, 2) if containers > 0 else 0
            ))
    
    return historical

def generate_forecast(historical_data: List[HistoricalData], forecast_year: int, warehouse_config: WarehouseConfig):
    """Generate forecast based on historical data"""
    months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    
    # Calculate averages and trends from historical data
    yearly_totals = {}
    for h in historical_data:
        if h.year not in yearly_totals:
            yearly_totals[h.year] = {"containers": 0, "cost": 0, "extras": 0}
        yearly_totals[h.year]["containers"] += h.containers
        yearly_totals[h.year]["cost"] += h.logistics_cost
        yearly_totals[h.year]["extras"] += h.extra_costs
    
    # Calculate growth rate
    years = sorted(yearly_totals.keys())
    if len(years) >= 2:
        growth_rate = (yearly_totals[years[-1]]["containers"] / yearly_totals[years[0]]["containers"]) ** (1 / len(years)) - 1
    else:
        growth_rate = 0.08  # Default 8% growth
    
    # Calculate monthly patterns (seasonality)
    monthly_patterns = {m: [] for m in months}
    for h in historical_data:
        monthly_patterns[h.month].append(h.containers)
    
    monthly_avg = {m: sum(v) / len(v) if v else 0 for m, v in monthly_patterns.items()}
    total_avg = sum(monthly_avg.values()) / 12
    seasonality = {m: v / total_avg if total_avg > 0 else 1 for m, v in monthly_avg.items()}
    
    # Generate forecast
    last_year_containers = yearly_totals[years[-1]]["containers"] if years else 300
    last_year_cost = yearly_totals[years[-1]]["cost"] if years else 1500000
    last_year_extras = yearly_totals[years[-1]]["extras"] if years else 180000
    
    forecasted_annual_containers = int(last_year_containers * (1 + growth_rate))
    monthly_forecast = []
    
    for month_idx, month in enumerate(months):
        seasonal = seasonality.get(month, 1)
        base_monthly = forecasted_annual_containers / 12
        
        forecasted_containers = int(base_monthly * seasonal * random.uniform(0.95, 1.05))
        forecasted_cost = round(forecasted_containers * (last_year_cost / last_year_containers) * 1.03, 2)  # 3% cost inflation
        forecasted_extras = round(forecasted_cost * 0.12 * random.uniform(0.9, 1.2), 2)
        
        # Confidence decreases for further months
        confidence = max(0.7, 0.95 - (month_idx * 0.02))
        
        monthly_forecast.append(ForecastData(
            month=month,
            month_num=month_idx + 1,
            forecasted_containers=forecasted_containers,
            forecasted_logistics_cost=forecasted_cost,
            forecasted_extra_costs=forecasted_extras,
            confidence_level=round(confidence, 2)
        ))
    
    return monthly_forecast, forecasted_annual_containers, growth_rate

def generate_delivery_calendar(monthly_forecast: List[ForecastData], warehouse_config: WarehouseConfig):
    """Generate delivery calendar based on forecast and warehouse capacity"""
    calendar = []
    current_date = datetime.now()
    
    # Working days mapping
    day_names = {
        0: "Lunes", 1: "Martes", 2: "Miércoles", 
        3: "Jueves", 4: "Viernes", 5: "Sábado", 6: "Domingo"
    }
    working_days_idx = [k for k, v in day_names.items() if v in warehouse_config.working_days]
    
    # Generate calendar for next 30 days
    containers_to_schedule = monthly_forecast[current_date.month - 1].forecasted_containers if monthly_forecast else 30
    containers_per_day = containers_to_schedule // 22  # ~22 working days per month
    
    for day_offset in range(30):
        date = current_date + timedelta(days=day_offset)
        day_of_week = date.weekday()
        
        if day_of_week in working_days_idx:
            # Schedule containers for this day
            scheduled = min(
                containers_per_day + random.randint(-2, 3),
                warehouse_config.max_containers_per_day
            )
            scheduled = max(0, scheduled)
            
            utilization = (scheduled / warehouse_config.max_containers_per_day) * 100 if warehouse_config.max_containers_per_day > 0 else 0
            
            # Generate container details
            containers = []
            for i in range(scheduled):
                containers.append({
                    "container_number": generate_container_number(),
                    "eta": f"{random.randint(8, 16)}:{random.choice(['00', '30'])}",
                    "origin": random.choice([p["name"] for p in PORTS]),
                    "type": random.choice(CONTAINER_TYPES)
                })
            
            calendar.append(DeliverySlot(
                date=date.strftime("%Y-%m-%d"),
                day_name=day_names[day_of_week],
                scheduled_containers=scheduled,
                max_capacity=warehouse_config.max_containers_per_day,
                utilization_percent=round(utilization, 1),
                containers=containers
            ))
    
    return calendar

@api_router.get("/planning/historical")
async def get_historical_data(user: dict = Depends(verify_token)):
    """Get historical logistics data for planning"""
    historical = generate_historical_data(3)
    
    # Aggregate by year
    yearly_summary = {}
    for h in historical:
        if h.year not in yearly_summary:
            yearly_summary[h.year] = {
                "containers": 0,
                "logistics_cost": 0,
                "extra_costs": 0,
                "months": []
            }
        yearly_summary[h.year]["containers"] += h.containers
        yearly_summary[h.year]["logistics_cost"] += h.logistics_cost
        yearly_summary[h.year]["extra_costs"] += h.extra_costs
        yearly_summary[h.year]["months"].append(h.model_dump())
    
    return {
        "historical_data": [h.model_dump() for h in historical],
        "yearly_summary": yearly_summary
    }

@api_router.get("/planning/forecast")
async def get_planning_forecast(
    doors: int = 8,
    user: dict = Depends(verify_token)
):
    """Get complete planning forecast with delivery calendar"""
    forecast_year = datetime.now().year + 1
    
    # Warehouse configuration
    warehouse = WarehouseConfig(
        name="CEDIS Principal",
        doors=doors,
        max_containers_per_day=doors,  # 1 container per door per day
        operating_hours="07:00-19:00",
        working_days=["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    )
    
    # Get historical data
    historical = generate_historical_data(3)
    
    # Generate forecast
    monthly_forecast, annual_containers, growth_rate = generate_forecast(historical, forecast_year, warehouse)
    
    # Generate delivery calendar
    delivery_calendar = generate_delivery_calendar(monthly_forecast, warehouse)
    
    # Calculate summaries
    total_forecasted_cost = sum(m.forecasted_logistics_cost for m in monthly_forecast)
    total_forecasted_extras = sum(m.forecasted_extra_costs for m in monthly_forecast)
    
    # Get current year actuals for comparison
    current_year = datetime.now().year
    current_year_data = [h for h in historical if h.year == current_year - 1]  # Use last full year
    actual_containers = sum(h.containers for h in current_year_data)
    actual_cost = sum(h.logistics_cost for h in current_year_data)
    actual_extras = sum(h.extra_costs for h in current_year_data)
    
    # Calculate working days per month for capacity planning
    working_days_per_month = 22  # Average
    monthly_capacity = warehouse.max_containers_per_day * working_days_per_month
    annual_capacity = monthly_capacity * 12
    
    return PlanningForecast(
        year=forecast_year,
        historical_summary={
            "years_analyzed": 3,
            "total_historical_containers": sum(h.containers for h in historical),
            "avg_monthly_containers": round(sum(h.containers for h in historical) / len(historical), 1),
            "growth_rate_percent": round(growth_rate * 100, 1),
            "avg_cost_per_container": round(sum(h.logistics_cost for h in historical) / sum(h.containers for h in historical), 2),
            "extra_cost_ratio_percent": round((sum(h.extra_costs for h in historical) / sum(h.logistics_cost for h in historical)) * 100, 1)
        },
        annual_forecast={
            "forecasted_containers": sum(m.forecasted_containers for m in monthly_forecast),
            "forecasted_logistics_cost": round(total_forecasted_cost, 2),
            "forecasted_extra_costs": round(total_forecasted_extras, 2),
            "total_forecasted_budget": round(total_forecasted_cost + total_forecasted_extras, 2),
            "avg_monthly_containers": round(sum(m.forecasted_containers for m in monthly_forecast) / 12, 1),
            "warehouse_capacity": {
                "doors": warehouse.doors,
                "daily_capacity": warehouse.max_containers_per_day,
                "monthly_capacity": monthly_capacity,
                "annual_capacity": annual_capacity,
                "utilization_forecast_percent": round((sum(m.forecasted_containers for m in monthly_forecast) / annual_capacity) * 100, 1)
            }
        },
        monthly_forecast=[m.model_dump() for m in monthly_forecast],
        delivery_calendar=[d.model_dump() for d in delivery_calendar],
        budget_comparison={
            "previous_year": {
                "year": current_year - 1,
                "containers": actual_containers,
                "logistics_cost": round(actual_cost, 2),
                "extra_costs": round(actual_extras, 2),
                "total": round(actual_cost + actual_extras, 2)
            },
            "forecast": {
                "year": forecast_year,
                "containers": sum(m.forecasted_containers for m in monthly_forecast),
                "logistics_cost": round(total_forecasted_cost, 2),
                "extra_costs": round(total_forecasted_extras, 2),
                "total": round(total_forecasted_cost + total_forecasted_extras, 2)
            },
            "variance": {
                "containers_diff": sum(m.forecasted_containers for m in monthly_forecast) - actual_containers,
                "containers_percent": round(((sum(m.forecasted_containers for m in monthly_forecast) - actual_containers) / actual_containers) * 100, 1) if actual_containers > 0 else 0,
                "cost_diff": round((total_forecasted_cost + total_forecasted_extras) - (actual_cost + actual_extras), 2),
                "cost_percent": round((((total_forecasted_cost + total_forecasted_extras) - (actual_cost + actual_extras)) / (actual_cost + actual_extras)) * 100, 1) if (actual_cost + actual_extras) > 0 else 0
            }
        }
    )

# ==================== INVENTORY ENDPOINTS ====================

@api_router.get("/inventory")
async def get_inventory(user: dict = Depends(verify_token)):
    """Get current CEDIS inventory with stock levels"""
    inventory = generate_cedis_inventory()
    
    # Summary stats
    critical_count = len([i for i in inventory if i.stock_status == "critical"])
    low_count = len([i for i in inventory if i.stock_status == "low"])
    optimal_count = len([i for i in inventory if i.stock_status == "optimal"])
    
    # Group by brand
    brands_summary = {}
    for item in inventory:
        if item.brand not in brands_summary:
            brands_summary[item.brand] = {"items": 0, "critical": 0, "low": 0}
        brands_summary[item.brand]["items"] += 1
        if item.stock_status == "critical":
            brands_summary[item.brand]["critical"] += 1
        elif item.stock_status == "low":
            brands_summary[item.brand]["low"] += 1
    
    return {
        "inventory": [i.model_dump() for i in inventory],
        "summary": {
            "total_products": len(inventory),
            "critical": critical_count,
            "low": low_count,
            "optimal": optimal_count,
            "needs_restock": critical_count + low_count
        },
        "brands_summary": brands_summary
    }

@api_router.get("/inventory/containers")
async def get_containers_by_product(user: dict = Depends(verify_token)):
    """Get containers in transit with product information, sorted by restock priority"""
    inventory = generate_cedis_inventory()
    containers = generate_containers_with_products(inventory)
    
    # Group containers by product
    products_in_transit = {}
    for c in containers:
        if c.sku not in products_in_transit:
            inv_item = next((i for i in inventory if i.sku == c.sku), None)
            products_in_transit[c.sku] = {
                "sku": c.sku,
                "product_name": c.product_name,
                "brand": c.brand,
                "current_stock": inv_item.current_stock if inv_item else 0,
                "minimum_stock": inv_item.minimum_stock if inv_item else 0,
                "priority_score": c.priority_score,
                "delivery_urgency": c.delivery_urgency,
                "containers": [],
                "total_units_in_transit": 0
            }
        products_in_transit[c.sku]["containers"].append(c.model_dump())
        products_in_transit[c.sku]["total_units_in_transit"] += c.quantity
    
    # Convert to list and sort by priority
    products_list = list(products_in_transit.values())
    products_list.sort(key=lambda x: x["priority_score"], reverse=True)
    
    return {
        "containers": [c.model_dump() for c in containers],
        "products_in_transit": products_list,
        "summary": {
            "total_containers": len(containers),
            "critical_deliveries": len([c for c in containers if c.delivery_urgency == "critical"]),
            "high_priority_deliveries": len([c for c in containers if c.delivery_urgency == "high"]),
            "products_being_restocked": len(products_in_transit)
        }
    }

@api_router.get("/inventory/restock-plan")
async def get_restock_plan(doors: int = 8, user: dict = Depends(verify_token)):
    """Get complete restock plan with delivery schedule based on priority"""
    inventory = generate_cedis_inventory()
    containers = generate_containers_with_products(inventory)
    
    # Create delivery schedule prioritized by stock levels
    warehouse = WarehouseConfig(
        name="CEDIS Principal",
        doors=doors,
        max_containers_per_day=doors,
        operating_hours="07:00-19:00",
        working_days=["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    )
    
    day_names = {0: "Lunes", 1: "Martes", 2: "Miércoles", 3: "Jueves", 4: "Viernes", 5: "Sábado", 6: "Domingo"}
    working_days_idx = [k for k, v in day_names.items() if v in warehouse.working_days]
    
    # Schedule containers by priority
    schedule = []
    containers_sorted = sorted(containers, key=lambda x: x.priority_score, reverse=True)
    
    current_date = datetime.now(timezone.utc)
    day_offset = 0
    daily_count = 0
    
    for container in containers_sorted:
        # Find next available day
        while True:
            check_date = current_date + timedelta(days=day_offset)
            if check_date.weekday() in working_days_idx:
                if daily_count < warehouse.max_containers_per_day:
                    break
                else:
                    day_offset += 1
                    daily_count = 0
            else:
                day_offset += 1
        
        delivery_date = current_date + timedelta(days=day_offset)
        
        # Get inventory info for this product
        inv_item = next((i for i in inventory if i.sku == container.sku), None)
        
        schedule.append({
            "delivery_date": delivery_date.strftime("%Y-%m-%d"),
            "day_name": day_names[delivery_date.weekday()],
            "container_number": container.container_number,
            "sku": container.sku,
            "product_name": container.product_name,
            "brand": container.brand,
            "quantity": container.quantity,
            "current_stock": inv_item.current_stock if inv_item else 0,
            "minimum_stock": inv_item.minimum_stock if inv_item else 0,
            "stock_after_delivery": (inv_item.current_stock if inv_item else 0) + container.quantity,
            "priority_score": container.priority_score,
            "delivery_urgency": container.delivery_urgency,
            "slot_number": daily_count + 1
        })
        
        daily_count += 1
        if daily_count >= warehouse.max_containers_per_day:
            day_offset += 1
            daily_count = 0
    
    # Group by date for calendar view
    calendar = {}
    for item in schedule:
        date = item["delivery_date"]
        if date not in calendar:
            calendar[date] = {
                "date": date,
                "day_name": item["day_name"],
                "deliveries": [],
                "total_containers": 0,
                "capacity": warehouse.max_containers_per_day
            }
        calendar[date]["deliveries"].append(item)
        calendar[date]["total_containers"] += 1
    
    calendar_list = sorted(calendar.values(), key=lambda x: x["date"])
    
    return {
        "restock_schedule": schedule,
        "calendar": calendar_list,
        "warehouse_config": {
            "doors": warehouse.doors,
            "daily_capacity": warehouse.max_containers_per_day,
            "operating_hours": warehouse.operating_hours
        },
        "summary": {
            "total_containers_scheduled": len(schedule),
            "days_needed": len(calendar_list),
            "critical_products": len([s for s in schedule if s["delivery_urgency"] == "critical"]),
            "total_units_to_receive": sum(s["quantity"] for s in schedule)
        }
    }

@api_router.put("/inventory/{sku}/min-stock")
async def update_min_stock(sku: str, min_stock: int, user: dict = Depends(verify_token)):
    """Update minimum stock level for a product"""
    # In production, this would update the database
    return {
        "success": True,
        "message": f"Stock mínimo actualizado para {sku}",
        "sku": sku,
        "new_min_stock": min_stock
    }

# ==================== PRODUCT MANAGEMENT ENDPOINTS ====================

@api_router.post("/inventory/products")
async def create_product(product: NewProductRequest, user: dict = Depends(verify_token)):
    """Add a new product to the inventory"""
    # Validate SKU doesn't exist
    existing = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == product.sku), None)
    if existing:
        raise HTTPException(status_code=400, detail=f"SKU {product.sku} ya existe")
    
    # In production, save to database
    new_product = {
        "id": str(uuid.uuid4()),
        "sku": product.sku,
        "name": product.name,
        "brand": product.brand,
        "category": product.category,
        "units_per_container": product.units_per_container,
        "minimum_stock": product.minimum_stock,
        "maximum_stock": product.maximum_stock,
        "zone_preference": product.zone_preference,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Save to MongoDB
    await db.products.insert_one(new_product)
    
    # Remove MongoDB _id from response
    new_product.pop("_id", None)
    
    return {
        "success": True,
        "message": f"Producto {product.name} creado exitosamente",
        "product": new_product
    }

@api_router.get("/inventory/products")
async def get_all_products(user: dict = Depends(verify_token)):
    """Get all products including custom ones"""
    # Get products from database
    db_products = await db.products.find({}, {"_id": 0}).to_list(100)
    
    # Combine with default products
    all_products = []
    for p in PERNOD_RICARD_PRODUCTS:
        all_products.append({
            **p,
            "id": str(uuid.uuid4()),
            "minimum_stock": random.randint(500, 2000),
            "maximum_stock": random.randint(4000, 8000),
            "zone_preference": get_zone_for_category(p["category"]),
            "source": "default"
        })
    
    for p in db_products:
        all_products.append({**p, "source": "custom"})
    
    return {
        "products": all_products,
        "total": len(all_products),
        "categories": list(set(p.get("category", "Otros") for p in all_products)),
        "brands": list(set(p.get("brand", "Sin marca") for p in all_products))
    }

# ==================== WAREHOUSE POSITIONS ENDPOINTS ====================

@api_router.get("/inventory/{sku}/positions")
async def get_product_positions(sku: str, user: dict = Depends(verify_token)):
    """Get warehouse positions for a specific product"""
    # Find product
    product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == sku), None)
    if not product:
        # Check database
        db_product = await db.products.find_one({"sku": sku}, {"_id": 0})
        if db_product:
            product = db_product
        else:
            raise HTTPException(status_code=404, detail=f"Producto {sku} no encontrado")
    
    # Generate inventory for this product
    inventory = generate_cedis_inventory()
    inv_item = next((i for i in inventory if i.sku == sku), None)
    
    if not inv_item:
        raise HTTPException(status_code=404, detail=f"No hay inventario para {sku}")
    
    # Generate positions
    positions, zone = generate_warehouse_positions(
        sku=sku,
        product_name=product["name"],
        category=product.get("category", "Otros"),
        total_units=inv_item.current_stock
    )
    
    # Calculate zone distribution
    zone_dist = {}
    for pos in positions:
        if pos.zone not in zone_dist:
            zone_dist[pos.zone] = {"positions": 0, "units": 0}
        zone_dist[pos.zone]["positions"] += 1
        zone_dist[pos.zone]["units"] += pos.current_units
    
    # Get recommended door based on most common zone
    recommended_door = get_recommended_door(zone)
    
    return ProductPositions(
        sku=sku,
        product_name=product["name"],
        brand=product.get("brand", "Sin marca"),
        total_units=inv_item.current_stock,
        positions=positions,
        recommended_door=recommended_door,
        zone_distribution=zone_dist
    )

@api_router.get("/warehouse/zones")
async def get_warehouse_zones(user: dict = Depends(verify_token)):
    """Get warehouse zone configuration"""
    zones = []
    for zone_id, config in WAREHOUSE_ZONES.items():
        zones.append({
            "zone_id": zone_id,
            "name": config["name"],
            "door_range": config["door_range"],
            "categories": config["categories"],
            "description": f"Puertas {config['door_range'][0]}-{config['door_range'][1]}"
        })
    return {"zones": zones, "total_zones": len(zones)}

@api_router.get("/warehouse/map")
async def get_warehouse_map(user: dict = Depends(verify_token)):
    """Get warehouse map with all positions and their status"""
    inventory = generate_cedis_inventory()
    
    warehouse_map = []
    for zone_id, config in WAREHOUSE_ZONES.items():
        zone_products = []
        for inv in inventory:
            product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == inv.sku), None)
            if product and product.get("category") in config["categories"]:
                positions, _ = generate_warehouse_positions(
                    inv.sku, inv.name, product.get("category", "Otros"), inv.current_stock
                )
                zone_products.append({
                    "sku": inv.sku,
                    "name": inv.name,
                    "brand": inv.brand,
                    "positions_count": len(positions),
                    "total_units": inv.current_stock,
                    "stock_status": inv.stock_status
                })
        
        warehouse_map.append({
            "zone_id": zone_id,
            "zone_name": config["name"],
            "doors": config["door_range"],
            "products": zone_products,
            "products_count": len(zone_products)
        })
    
    return {"warehouse_map": warehouse_map}

# ==================== TRANSIT PLANNING & RESTOCK PREDICTIONS ====================

@api_router.get("/planning/transit-routes")
async def get_transit_routes(user: dict = Depends(verify_token)):
    """Get available transit routes with lead times"""
    routes = []
    for r in TRANSIT_ROUTES:
        total_lead = r["transit_days"] + r["port_days"] + r["customs_days"] + r["inland_days"]
        routes.append({
            "route_id": str(uuid.uuid4()),
            "origin": r["origin"],
            "destination": r["destination"],
            "transport_mode": r["mode"],
            "transit_days": r["transit_days"],
            "port_handling_days": r["port_days"],
            "customs_days": r["customs_days"],
            "inland_transport_days": r["inland_days"],
            "total_lead_time_days": total_lead,
            "cost_per_container": r["cost"]
        })
    return {"routes": routes, "total": len(routes)}

@api_router.get("/planning/restock-predictions")
async def get_restock_predictions(user: dict = Depends(verify_token)):
    """Get predictions for when to order products based on transit time"""
    inventory = generate_cedis_inventory()
    predictions = generate_restock_predictions(inventory)
    
    # Summary stats
    immediate_count = len([p for p in predictions if p.urgency_level == "immediate"])
    soon_count = len([p for p in predictions if p.urgency_level == "soon"])
    
    return {
        "predictions": [p.model_dump() for p in predictions],
        "summary": {
            "total_products": len(predictions),
            "immediate_action_required": immediate_count,
            "order_soon": soon_count,
            "avg_lead_time_days": round(sum(p.transit_time_days for p in predictions) / len(predictions), 1) if predictions else 0
        },
        "routes_used": list(set(p.suggested_origin for p in predictions))
    }

@api_router.get("/planning/restock-timeline")
async def get_restock_timeline(days: int = 30, user: dict = Depends(verify_token)):
    """Get timeline view of when orders need to be placed and expected deliveries"""
    inventory = generate_cedis_inventory()
    predictions = generate_restock_predictions(inventory)
    
    # Create timeline for next N days
    timeline = []
    today = datetime.now(timezone.utc).date()
    
    for day_offset in range(days):
        current_date = today + timedelta(days=day_offset)
        date_str = current_date.strftime("%Y-%m-%d")
        
        # Orders to place on this day
        orders_to_place = [p for p in predictions if p.reorder_point_date == date_str]
        # Deliveries expected on this day
        deliveries_expected = [p for p in predictions if p.expected_delivery_date == date_str]
        
        if orders_to_place or deliveries_expected:
            timeline.append({
                "date": date_str,
                "day_name": ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][current_date.weekday()],
                "orders_to_place": [{
                    "sku": o.sku,
                    "product_name": o.product_name,
                    "brand": o.brand,
                    "quantity": o.recommended_quantity,
                    "origin": o.suggested_origin,
                    "urgency": o.urgency_level
                } for o in orders_to_place],
                "deliveries_expected": [{
                    "sku": d.sku,
                    "product_name": d.product_name,
                    "brand": d.brand,
                    "quantity": d.recommended_quantity
                } for d in deliveries_expected],
                "orders_count": len(orders_to_place),
                "deliveries_count": len(deliveries_expected)
            })
    
    return {
        "timeline": timeline,
        "period_days": days,
        "total_orders_planned": sum(len(t["orders_to_place"]) for t in timeline),
        "total_deliveries_expected": sum(len(t["deliveries_expected"]) for t in timeline)
    }

# ==================== SUPPLY CHAIN PLANNING (INTEGRATED) ====================

@api_router.get("/planning/supply-chain")
async def get_supply_chain_plan(user: dict = Depends(verify_token)):
    """
    Obtiene la planificación integrada de cadena de suministro.
    ORIGEN → INBOUND → CEDIS → DISTRIBUCIÓN → CLIENTE FINAL
    
    El objetivo es garantizar que el cliente final NUNCA se quede sin producto.
    """
    plans = generate_supply_chain_plan()
    
    # Estadísticas
    emergency_count = len([p for p in plans if p.action_required == "emergency"])
    order_now_count = len([p for p in plans if p.action_required in ["order_now", "emergency"]])
    distribute_count = len([p for p in plans if p.action_required == "distribute"])
    
    total_critical_locations = sum(p.critical_end_client_locations for p in plans)
    total_deficit = sum(p.cedis_deficit for p in plans)
    
    return {
        "plans": [p.model_dump() for p in plans],
        "summary": {
            "total_skus_analyzed": len(plans),
            "emergency_actions": emergency_count,
            "orders_needed": order_now_count,
            "distributions_needed": distribute_count,
            "total_critical_end_locations": total_critical_locations,
            "total_cedis_deficit": total_deficit
        },
        "alerts": {
            "has_emergencies": emergency_count > 0,
            "message": f"🚨 {emergency_count} productos requieren acción de EMERGENCIA" if emergency_count > 0 
                      else f"⚠️ {order_now_count} productos necesitan pedido a origen" if order_now_count > 0
                      else "✅ Cadena de suministro estable"
        }
    }

@api_router.get("/planning/supply-chain/{sku}")
async def get_sku_supply_chain_plan(sku: str, user: dict = Depends(verify_token)):
    """Obtiene el plan de cadena de suministro para un SKU específico"""
    plans = generate_supply_chain_plan()
    plan = next((p for p in plans if p.sku == sku), None)
    
    if not plan:
        raise HTTPException(status_code=404, detail=f"SKU {sku} no encontrado")
    
    # Obtener detalle de ubicaciones de clientes finales que necesitan este producto
    all_end_client_inventory = generate_end_client_inventory()
    locations_needing = [
        {
            "client_name": item.client_name,
            "store_code": item.store_code,
            "store_name": item.store_name,
            "current_stock": item.current_stock,
            "days_of_stock": item.days_of_stock,
            "suggested_quantity": item.suggested_quantity,
            "estimated_stockout": item.estimated_stockout_date
        }
        for item in all_end_client_inventory 
        if item.sku == sku and item.needs_restock
    ]
    
    # Ordenar por días de stock (más urgente primero)
    locations_needing.sort(key=lambda x: x["days_of_stock"])
    
    return {
        "plan": plan.model_dump(),
        "end_client_locations_needing": locations_needing,
        "locations_count": len(locations_needing)
    }

@api_router.get("/planning/distribution-orders")
async def get_distribution_orders(user: dict = Depends(verify_token)):
    """
    Obtiene las órdenes de distribución pendientes.
    Estas son entregas que deben salir de CEDIS hacia clientes finales.
    """
    orders = generate_distribution_orders()
    
    # Agrupar por prioridad
    by_priority = {"critical": [], "high": [], "medium": [], "low": []}
    for order in orders:
        by_priority[order.priority].append(order.model_dump())
    
    # Agrupar por cliente
    by_client = {}
    for order in orders:
        if order.client_name not in by_client:
            by_client[order.client_name] = {"orders": 0, "units": 0}
        by_client[order.client_name]["orders"] += 1
        by_client[order.client_name]["units"] += order.quantity
    
    return {
        "orders": [o.model_dump() for o in orders],
        "by_priority": by_priority,
        "by_client": by_client,
        "summary": {
            "total_orders": len(orders),
            "critical_orders": len(by_priority["critical"]),
            "total_units": sum(o.quantity for o in orders),
            "clients_to_serve": len(by_client)
        }
    }

@api_router.get("/planning/action-items")
async def get_action_items(user: dict = Depends(verify_token)):
    """
    Obtiene una lista priorizada de acciones a tomar:
    1. Pedidos a origen que deben hacerse hoy
    2. Distribuciones que deben salir de CEDIS
    3. Alertas de desabasto inminente en clientes finales
    """
    plans = generate_supply_chain_plan()
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    actions = {
        "origin_orders_today": [],
        "distributions_urgent": [],
        "end_client_alerts": []
    }
    
    for plan in plans:
        # Pedidos a origen para hoy
        if plan.cedis_reorder_date and plan.cedis_reorder_date <= today:
            if plan.action_required in ["emergency", "order_now"]:
                actions["origin_orders_today"].append({
                    "sku": plan.sku,
                    "product_name": plan.product_name,
                    "brand": plan.brand,
                    "action": plan.action_required,
                    "description": plan.action_description,
                    "origin": plan.suggested_origin,
                    "deficit": plan.cedis_deficit,
                    "expected_arrival": plan.expected_inbound_date,
                    "priority": plan.priority_score
                })
        
        # Distribuciones urgentes
        if plan.distribution_ship_by_date and plan.distribution_ship_by_date <= today:
            if plan.can_fulfill_from_cedis and plan.end_clients_needing_restock > 0:
                actions["distributions_urgent"].append({
                    "sku": plan.sku,
                    "product_name": plan.product_name,
                    "brand": plan.brand,
                    "locations_to_serve": plan.end_clients_needing_restock,
                    "units_needed": plan.total_end_client_demand,
                    "ship_by": plan.distribution_ship_by_date,
                    "priority": plan.priority_score
                })
        
        # Alertas de desabasto
        if plan.critical_end_client_locations > 0:
            actions["end_client_alerts"].append({
                "sku": plan.sku,
                "product_name": plan.product_name,
                "brand": plan.brand,
                "critical_locations": plan.critical_end_client_locations,
                "earliest_stockout": plan.earliest_end_client_stockout,
                "can_fulfill": plan.can_fulfill_from_cedis,
                "action": plan.action_description,
                "priority": plan.priority_score
            })
    
    # Ordenar cada lista por prioridad
    for key in actions:
        actions[key].sort(key=lambda x: x["priority"], reverse=True)
    
    return {
        "actions": actions,
        "summary": {
            "orders_to_place_today": len(actions["origin_orders_today"]),
            "urgent_distributions": len(actions["distributions_urgent"]),
            "end_client_alerts": len(actions["end_client_alerts"]),
            "requires_immediate_attention": len(actions["origin_orders_today"]) > 0 or len(actions["end_client_alerts"]) > 0
        },
        "generated_at": today
    }

# ==================== END CLIENT INVENTORY (WALMART, ETC.) ====================

@api_router.get("/inventory/end-clients")
async def get_end_clients_list(user: dict = Depends(verify_token)):
    """Get list of end clients (retailers) we track inventory for"""
    clients = []
    for client in END_CLIENTS:
        total_stores = sum(1 for r in client["regions"]) * client["stores_per_region"]
        clients.append({
            "name": client["name"],
            "code_prefix": client["code_prefix"],
            "regions": client["regions"],
            "total_stores": total_stores
        })
    return {"clients": clients, "total": len(clients)}

@api_router.get("/inventory/end-clients/{client_name}")
async def get_end_client_inventory(client_name: str, user: dict = Depends(verify_token)):
    """Get inventory details for a specific end client (e.g., Walmart)"""
    # Validate client exists
    client = next((c for c in END_CLIENTS if c["name"].lower() == client_name.lower()), None)
    if not client:
        raise HTTPException(status_code=404, detail=f"Cliente {client_name} no encontrado")
    
    inventory = generate_end_client_inventory(client["name"])
    
    # Group by store
    stores = {}
    for item in inventory:
        if item.store_code not in stores:
            stores[item.store_code] = {
                "store_code": item.store_code,
                "store_name": item.store_name,
                "products": [],
                "needs_restock_count": 0,
                "critical_count": 0
            }
        stores[item.store_code]["products"].append(item.model_dump())
        if item.needs_restock:
            stores[item.store_code]["needs_restock_count"] += 1
        if item.days_of_stock <= 3:
            stores[item.store_code]["critical_count"] += 1
    
    stores_list = sorted(stores.values(), key=lambda x: x["critical_count"], reverse=True)
    
    # Summary
    total_needs_restock = len([i for i in inventory if i.needs_restock])
    critical = len([i for i in inventory if i.days_of_stock <= 3])
    
    return {
        "client_name": client["name"],
        "stores": stores_list,
        "summary": EndClientSummary(
            client_name=client["name"],
            total_locations=len(stores),
            products_tracked=len(inventory),
            locations_needing_restock=len([s for s in stores_list if s["needs_restock_count"] > 0]),
            critical_stockouts=critical,
            total_units_to_ship=sum(i.suggested_quantity for i in inventory if i.needs_restock)
        ).model_dump(),
        "regions": client["regions"]
    }

@api_router.get("/inventory/end-clients/{client_name}/summary")
async def get_end_client_summary(client_name: str, user: dict = Depends(verify_token)):
    """Get summary of inventory needs for an end client"""
    client = next((c for c in END_CLIENTS if c["name"].lower() == client_name.lower()), None)
    if not client:
        raise HTTPException(status_code=404, detail=f"Cliente {client_name} no encontrado")
    
    inventory = generate_end_client_inventory(client["name"])
    
    # Group by product SKU for aggregation
    product_summary = {}
    for item in inventory:
        if item.sku not in product_summary:
            product_summary[item.sku] = {
                "sku": item.sku,
                "product_name": item.product_name,
                "brand": item.brand,
                "total_stores": 0,
                "stores_needing_restock": 0,
                "total_current_stock": 0,
                "total_suggested_restock": 0,
                "avg_days_of_stock": 0,
                "critical_stores": 0
            }
        product_summary[item.sku]["total_stores"] += 1
        product_summary[item.sku]["total_current_stock"] += item.current_stock
        if item.needs_restock:
            product_summary[item.sku]["stores_needing_restock"] += 1
            product_summary[item.sku]["total_suggested_restock"] += item.suggested_quantity
        if item.days_of_stock <= 3:
            product_summary[item.sku]["critical_stores"] += 1
        product_summary[item.sku]["avg_days_of_stock"] += item.days_of_stock
    
    # Calculate averages
    for sku, data in product_summary.items():
        data["avg_days_of_stock"] = round(data["avg_days_of_stock"] / data["total_stores"], 1)
    
    # Sort by critical stores
    products_list = sorted(product_summary.values(), key=lambda x: x["critical_stores"], reverse=True)
    
    return {
        "client_name": client["name"],
        "products": products_list,
        "total_products": len(products_list),
        "products_needing_restock": len([p for p in products_list if p["stores_needing_restock"] > 0]),
        "total_restock_units": sum(p["total_suggested_restock"] for p in products_list)
    }

@api_router.get("/inventory/end-clients-overview")
async def get_all_end_clients_overview(user: dict = Depends(verify_token)):
    """Get overview of all end clients' inventory status"""
    overview = []
    
    for client in END_CLIENTS:
        inventory = generate_end_client_inventory(client["name"])
        
        total_stores = len(set(i.store_code for i in inventory))
        needs_restock = len([i for i in inventory if i.needs_restock])
        critical = len([i for i in inventory if i.days_of_stock <= 3])
        
        overview.append({
            "client_name": client["name"],
            "total_stores": total_stores,
            "products_tracked": len(inventory),
            "items_needing_restock": needs_restock,
            "critical_stockouts": critical,
            "restock_urgency": "critical" if critical > 10 else "high" if needs_restock > 20 else "normal",
            "total_units_to_ship": sum(i.suggested_quantity for i in inventory if i.needs_restock)
        })
    
    # Sort by urgency
    urgency_order = {"critical": 0, "high": 1, "normal": 2}
    overview.sort(key=lambda x: (urgency_order.get(x["restock_urgency"], 3), -x["critical_stockouts"]))
    
    return {
        "clients": overview,
        "total_clients": len(overview),
        "total_critical_items": sum(c["critical_stockouts"] for c in overview),
        "total_restock_items": sum(c["items_needing_restock"] for c in overview)
    }

# ==================== APPOINTMENTS ENDPOINTS ====================

@api_router.post("/appointments")
async def create_appointment(
    container_number: str,
    product_sku: str,
    scheduled_date: str,
    scheduled_time: str,
    operator_name: str,
    operator_license: str,
    insurance_policy: str,
    truck_plates: str,
    notes: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    """Create a delivery appointment"""
    # Find product
    product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == product_sku), None)
    if not product:
        db_product = await db.products.find_one({"sku": product_sku}, {"_id": 0})
        if db_product:
            product = db_product
        else:
            raise HTTPException(status_code=404, detail=f"Producto {product_sku} no encontrado")
    
    # Calculate recommended door
    zone = get_zone_for_category(product.get("category", "Otros"))
    assigned_door = get_recommended_door(zone)
    
    appointment = DeliveryAppointment(
        container_number=container_number,
        product_sku=product_sku,
        product_name=product["name"],
        brand=product.get("brand", "Sin marca"),
        quantity=product.get("units_per_container", 1500),
        scheduled_date=scheduled_date,
        scheduled_time=scheduled_time,
        assigned_door=assigned_door,
        operator_name=operator_name,
        operator_license=operator_license,
        insurance_policy=insurance_policy,
        truck_plates=truck_plates,
        status="scheduled",
        notes=notes
    )
    
    # Save to MongoDB
    await db.appointments.insert_one(appointment.model_dump())
    
    return {
        "success": True,
        "message": "Cita creada exitosamente",
        "appointment": appointment.model_dump(),
        "door_assignment": {
            "assigned_door": assigned_door,
            "zone": zone,
            "zone_name": WAREHOUSE_ZONES[zone]["name"],
            "reason": f"Puerta {assigned_door} asignada por cercanía a {WAREHOUSE_ZONES[zone]['name']}"
        }
    }

@api_router.get("/appointments")
async def get_appointments(
    date: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(verify_token)
):
    """Get delivery appointments"""
    # Get from database
    query = {}
    if date:
        query["scheduled_date"] = date
    if status:
        query["status"] = status
    
    db_appointments = await db.appointments.find(query, {"_id": 0}).to_list(100)
    
    # If no appointments in DB, generate mock data
    if not db_appointments:
        inventory = generate_cedis_inventory()
        containers = generate_containers_with_products(inventory)
        
        mock_appointments = []
        operators = [
            {"name": "Juan Carlos Mendoza", "license": "LIC-MX-4521789", "insurance": "POL-SEG-2024-001"},
            {"name": "Roberto García Luna", "license": "LIC-MX-3287654", "insurance": "POL-SEG-2024-002"},
            {"name": "Miguel Ángel Torres", "license": "LIC-MX-9876543", "insurance": "POL-SEG-2024-003"},
            {"name": "Francisco Javier Ruiz", "license": "LIC-MX-1234567", "insurance": "POL-SEG-2024-004"},
            {"name": "Carlos Eduardo Vega", "license": "LIC-MX-7654321", "insurance": "POL-SEG-2024-005"},
        ]
        
        for i, container in enumerate(containers[:10]):
            operator = random.choice(operators)
            product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == container.sku), None)
            zone = get_zone_for_category(product.get("category", "Otros")) if product else "E"
            
            sched_date = datetime.now(timezone.utc) + timedelta(days=random.randint(0, 7))
            
            mock_appointments.append({
                "id": str(uuid.uuid4()),
                "container_number": container.container_number,
                "product_sku": container.sku,
                "product_name": container.product_name,
                "brand": container.brand,
                "quantity": container.quantity,
                "scheduled_date": sched_date.strftime("%Y-%m-%d"),
                "scheduled_time": f"{random.randint(7, 16):02d}:{random.choice(['00', '30'])}",
                "assigned_door": get_recommended_door(zone),
                "operator_name": operator["name"],
                "operator_license": operator["license"],
                "insurance_policy": operator["insurance"],
                "truck_plates": f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=3))}-{random.randint(100, 999)}-{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=1))}",
                "status": random.choice(["scheduled", "scheduled", "scheduled", "in_progress", "completed"]),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "notes": None
            })
        
        return {
            "appointments": mock_appointments,
            "total": len(mock_appointments),
            "by_status": {
                "scheduled": len([a for a in mock_appointments if a["status"] == "scheduled"]),
                "in_progress": len([a for a in mock_appointments if a["status"] == "in_progress"]),
                "completed": len([a for a in mock_appointments if a["status"] == "completed"])
            }
        }
    
    return {
        "appointments": db_appointments,
        "total": len(db_appointments),
        "by_status": {
            "scheduled": len([a for a in db_appointments if a.get("status") == "scheduled"]),
            "in_progress": len([a for a in db_appointments if a.get("status") == "in_progress"]),
            "completed": len([a for a in db_appointments if a.get("status") == "completed"])
        }
    }

@api_router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    new_status: str,
    user: dict = Depends(verify_token)
):
    """Update appointment status"""
    valid_statuses = ["scheduled", "in_progress", "completed", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status inválido. Use: {valid_statuses}")
    
    result = await db.appointments.update_one(
        {"id": appointment_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "message": f"Status actualizado a {new_status}",
        "appointment_id": appointment_id
    }

@api_router.get("/appointments/{appointment_id}/door-recommendation")
async def get_door_recommendation(appointment_id: str, user: dict = Depends(verify_token)):
    """Get intelligent door recommendation based on product storage location"""
    # Find appointment
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    
    if not appointment:
        # Generate mock recommendation
        product = random.choice(PERNOD_RICARD_PRODUCTS)
        zone = get_zone_for_category(product["category"])
        door = get_recommended_door(zone)
        
        return {
            "recommended_door": door,
            "zone": zone,
            "zone_name": WAREHOUSE_ZONES[zone]["name"],
            "reason": f"Producto {product['name']} se almacena en {WAREHOUSE_ZONES[zone]['name']}",
            "alternative_doors": WAREHOUSE_ZONES[zone]["door_range"],
            "distance_score": round(random.uniform(85, 99), 1),
            "optimization_details": {
                "storage_zone": zone,
                "nearest_aisles": [f"{zone}-{i:02d}" for i in range(1, 4)],
                "estimated_unload_time": f"{random.randint(45, 90)} minutos"
            }
        }
    
    product = next((p for p in PERNOD_RICARD_PRODUCTS if p["sku"] == appointment.get("product_sku")), None)
    if product:
        zone = get_zone_for_category(product["category"])
        door = get_recommended_door(zone)
        
        return {
            "recommended_door": door,
            "zone": zone,
            "zone_name": WAREHOUSE_ZONES[zone]["name"],
            "reason": f"Producto {product['name']} se almacena en {WAREHOUSE_ZONES[zone]['name']}",
            "alternative_doors": WAREHOUSE_ZONES[zone]["door_range"],
            "distance_score": round(random.uniform(85, 99), 1)
        }
    
    return {"recommended_door": random.randint(1, 8), "zone": "E", "reason": "Zona por defecto"}

@api_router.get("/containers/locations/all", response_model=List[ContainerLocation])
async def get_all_container_locations(user: dict = Depends(verify_token)):
    """Get all container locations for map display"""
    locations = []
    for i in range(random.randint(8, 15)):
        origin_port = random.choice(PORTS)
        dest_port = random.choice([p for p in PORTS if p != origin_port])
        status = random.choice(CONTAINER_STATUSES)
        
        if status == "En Puerto Origen":
            lat, lng = origin_port["lat"], origin_port["lng"]
        elif status == "Entregado" or status == "En Puerto Destino":
            lat, lng = dest_port["lat"], dest_port["lng"]
        else:
            progress = random.uniform(0.2, 0.8)
            lat = origin_port["lat"] + (dest_port["lat"] - origin_port["lat"]) * progress
            lng = origin_port["lng"] + (dest_port["lng"] - origin_port["lng"]) * progress
        
        locations.append(ContainerLocation(
            container_id=generate_container_number(),
            latitude=lat,
            longitude=lng,
            status=status,
            origin=origin_port["name"],
            destination=dest_port["name"],
            vessel_name=random.choice(VESSELS) if status == "En Tránsito" else None,
            eta=datetime.now(timezone.utc).isoformat()
        ))
    return locations

@api_router.get("/orders", response_model=List[Order])
async def get_orders(user: dict = Depends(verify_token)):
    """Get all orders for the client"""
    orders = []
    statuses = ["Pendiente", "En Proceso", "En Tránsito", "En Aduana", "Entregado", "Completado"]
    
    for i in range(random.randint(8, 15)):
        origin_port = random.choice(PORTS)
        dest_port = random.choice([p for p in PORTS if p != origin_port])
        
        orders.append(Order(
            order_number=generate_order_number(),
            client_id=user["id"],
            origin=origin_port["name"],
            destination=dest_port["name"],
            container_type=random.choice(CONTAINER_TYPES),
            container_size=random.choice(CONTAINER_SIZES),
            cargo_description=random.choice([
                "Electrónicos de consumo",
                "Autopartes",
                "Textiles",
                "Maquinaria industrial",
                "Productos químicos",
                "Alimentos enlatados"
            ]),
            weight=round(random.uniform(5000, 25000), 2),
            status=random.choice(statuses),
            total_cost=round(random.uniform(2500, 15000), 2),
            estimated_delivery=datetime.now(timezone.utc).isoformat()
        ))
    return orders

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, user: dict = Depends(verify_token)):
    """Create a new order"""
    new_order = Order(
        order_number=generate_order_number(),
        client_id=user["id"],
        origin=order_data.origin,
        destination=order_data.destination,
        container_type=order_data.container_type,
        container_size=order_data.container_size,
        cargo_description=order_data.cargo_description,
        weight=order_data.weight,
        status="Pendiente",
        total_cost=round(random.uniform(2500, 8000), 2)
    )
    
    # Save to MongoDB
    doc = new_order.model_dump()
    await db.orders.insert_one(doc)
    
    return new_order

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, user: dict = Depends(verify_token)):
    """Get single order details"""
    # Try to find in DB first
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if order:
        return Order(**order)
    
    # Return mock data if not found
    origin_port = random.choice(PORTS)
    dest_port = random.choice([p for p in PORTS if p != origin_port])
    
    return Order(
        id=order_id,
        order_number=generate_order_number(),
        client_id=user["id"],
        origin=origin_port["name"],
        destination=dest_port["name"],
        container_type=random.choice(CONTAINER_TYPES),
        container_size=random.choice(CONTAINER_SIZES),
        cargo_description="Electrónicos de consumo",
        weight=round(random.uniform(5000, 25000), 2),
        status="En Proceso",
        total_cost=round(random.uniform(2500, 15000), 2)
    )

@api_router.post("/orders/{order_id}/documents")
async def upload_document(
    order_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(verify_token)
):
    """Upload document to an order (simulates ERP upload)"""
    # Read file content
    content = await file.read()
    
    # In production, this would upload to ERP
    # For now, we'll simulate success
    document = OrderDocument(
        name=file.filename,
        type=file.content_type or "application/octet-stream",
        url=f"/documents/{order_id}/{file.filename}",
        uploaded_at=datetime.now(timezone.utc).isoformat()
    )
    
    return {
        "success": True,
        "message": "Documento subido exitosamente",
        "document": document.model_dump()
    }

@api_router.get("/additionals", response_model=List[Additional])
async def get_additionals(user: dict = Depends(verify_token)):
    """Get all pending additionals for approval"""
    additionals = []
    descriptions = [
        "Demora en puerto - día adicional",
        "Almacenaje extendido",
        "Fumigación de contenedor",
        "Inspección aduanal adicional",
        "Maniobra especial de carga",
        "Seguro adicional de carga",
        "Transporte terrestre urgente"
    ]
    
    for i in range(random.randint(3, 8)):
        additionals.append(Additional(
            order_id=str(uuid.uuid4()),
            order_number=generate_order_number(),
            description=random.choice(descriptions),
            amount=round(random.uniform(150, 2500), 2),
            status=random.choice(["Pendiente", "Pendiente", "Aprobado", "Rechazado"]),
            requested_at=datetime.now(timezone.utc).isoformat()
        ))
    return additionals

@api_router.put("/additionals/{additional_id}/approve")
async def approve_additional(additional_id: str, user: dict = Depends(verify_token)):
    """Approve an additional charge"""
    return {
        "success": True,
        "message": "Adicional aprobado exitosamente",
        "additional_id": additional_id,
        "approved_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.put("/additionals/{additional_id}/reject")
async def reject_additional(additional_id: str, user: dict = Depends(verify_token)):
    """Reject an additional charge"""
    return {
        "success": True,
        "message": "Adicional rechazado",
        "additional_id": additional_id,
        "rejected_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/account-statement", response_model=AccountStatement)
async def get_account_statement(user: dict = Depends(verify_token)):
    """Get account statement with transactions"""
    transactions = []
    balance = 50000.0
    
    transaction_types = [
        ("Factura", "charge"),
        ("Pago recibido", "payment"),
        ("Adicional", "charge"),
        ("Nota de crédito", "credit"),
    ]
    
    for i in range(random.randint(15, 25)):
        trans_desc, trans_type = random.choice(transaction_types)
        
        if trans_type == "charge":
            amount = round(random.uniform(1500, 12000), 2)
            balance += amount
        else:
            amount = -round(random.uniform(1000, 15000), 2)
            balance += amount
        
        transactions.append(Transaction(
            date=datetime.now(timezone.utc).isoformat(),
            description=f"{trans_desc} - {generate_order_number()}" if trans_type != "payment" else trans_desc,
            type=trans_type,
            amount=amount,
            balance=round(balance, 2),
            order_number=generate_order_number() if trans_type != "payment" else None
        ))
    
    return AccountStatement(
        client_name=user["company"],
        account_number="TM-CLT-001234",
        current_balance=round(balance, 2),
        credit_limit=100000.0,
        available_credit=round(100000.0 - balance, 2),
        transactions=transactions
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
