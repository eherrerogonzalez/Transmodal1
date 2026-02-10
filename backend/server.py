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
