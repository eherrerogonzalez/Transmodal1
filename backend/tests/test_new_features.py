"""
Backend API Tests for New Features:
1. Transit Planning - Restock predictions based on transit time
2. End Client Inventory - Walmart, Costco, HEB, etc. visibility
3. Appointments and Products CRUD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_erp_token"

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": TOKEN
    })
    return session


class TestTransitRoutes:
    """Test /api/planning/transit-routes endpoint"""
    
    def test_get_transit_routes_success(self, api_client):
        """GET /api/planning/transit-routes - should return transit routes with lead times"""
        response = api_client.get(f"{BASE_URL}/api/planning/transit-routes")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "routes" in data, "Response should contain 'routes' key"
        assert "total" in data, "Response should contain 'total' key"
        assert len(data["routes"]) > 0, "Should have at least one route"
        
        # Validate route structure
        route = data["routes"][0]
        required_fields = ["route_id", "origin", "destination", "transport_mode", 
                          "transit_days", "port_handling_days", "customs_days", 
                          "inland_transport_days", "total_lead_time_days", "cost_per_container"]
        for field in required_fields:
            assert field in route, f"Route should have '{field}' field"
        
        # Validate lead time calculation
        expected_total = route["transit_days"] + route["port_handling_days"] + route["customs_days"] + route["inland_transport_days"]
        assert route["total_lead_time_days"] == expected_total, "Total lead time should be sum of components"
        
        print(f"✓ Transit routes: {data['total']} routes returned")


class TestRestockPredictions:
    """Test /api/planning/restock-predictions endpoint"""
    
    def test_get_restock_predictions_success(self, api_client):
        """GET /api/planning/restock-predictions - should return predictions with dates"""
        response = api_client.get(f"{BASE_URL}/api/planning/restock-predictions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "predictions" in data, "Response should contain 'predictions' key"
        assert "summary" in data, "Response should contain 'summary' key"
        assert "routes_used" in data, "Response should contain 'routes_used' key"
        
        # Validate summary structure
        summary = data["summary"]
        assert "total_products" in summary
        assert "immediate_action_required" in summary
        assert "order_soon" in summary
        assert "avg_lead_time_days" in summary
        
        # Validate prediction structure
        if len(data["predictions"]) > 0:
            pred = data["predictions"][0]
            required_fields = ["product_id", "sku", "product_name", "brand", "current_stock",
                              "minimum_stock", "daily_consumption_rate", "days_until_stockout",
                              "reorder_point_date", "expected_delivery_date", "transit_time_days",
                              "recommended_quantity", "urgency_level", "suggested_origin", "route_details"]
            for field in required_fields:
                assert field in pred, f"Prediction should have '{field}' field"
            
            # Validate urgency levels
            valid_urgencies = ["immediate", "soon", "scheduled", "ok"]
            assert pred["urgency_level"] in valid_urgencies, f"Invalid urgency: {pred['urgency_level']}"
            
            # Validate route_details
            assert "origin" in pred["route_details"]
            assert "destination" in pred["route_details"]
            assert "total_lead_time" in pred["route_details"]
        
        print(f"✓ Restock predictions: {summary['total_products']} products, {summary['immediate_action_required']} immediate")


class TestRestockTimeline:
    """Test /api/planning/restock-timeline endpoint"""
    
    def test_get_restock_timeline_success(self, api_client):
        """GET /api/planning/restock-timeline - should return timeline for next 30 days"""
        response = api_client.get(f"{BASE_URL}/api/planning/restock-timeline?days=30")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "timeline" in data, "Response should contain 'timeline' key"
        assert "period_days" in data, "Response should contain 'period_days' key"
        assert "total_orders_planned" in data, "Response should contain 'total_orders_planned' key"
        assert "total_deliveries_expected" in data, "Response should contain 'total_deliveries_expected' key"
        
        assert data["period_days"] == 30, "Period should be 30 days"
        
        # Validate timeline entry structure
        if len(data["timeline"]) > 0:
            entry = data["timeline"][0]
            assert "date" in entry
            assert "day_name" in entry
            assert "orders_to_place" in entry
            assert "deliveries_expected" in entry
            assert "orders_count" in entry
            assert "deliveries_count" in entry
            
            # Validate day names are in Spanish
            valid_days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
            assert entry["day_name"] in valid_days, f"Invalid day name: {entry['day_name']}"
        
        print(f"✓ Restock timeline: {data['total_orders_planned']} orders, {data['total_deliveries_expected']} deliveries")


class TestEndClientsList:
    """Test /api/inventory/end-clients endpoint"""
    
    def test_get_end_clients_list_success(self, api_client):
        """GET /api/inventory/end-clients - should return list of retailers"""
        response = api_client.get(f"{BASE_URL}/api/inventory/end-clients")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "clients" in data, "Response should contain 'clients' key"
        assert "total" in data, "Response should contain 'total' key"
        assert len(data["clients"]) > 0, "Should have at least one client"
        
        # Validate client structure
        client = data["clients"][0]
        assert "name" in client
        assert "code_prefix" in client
        assert "regions" in client
        assert "total_stores" in client
        
        # Check expected clients exist
        client_names = [c["name"] for c in data["clients"]]
        expected_clients = ["Walmart", "Costco", "HEB"]
        for expected in expected_clients:
            assert expected in client_names, f"Expected client '{expected}' not found"
        
        print(f"✓ End clients list: {data['total']} clients - {', '.join(client_names)}")


class TestEndClientInventory:
    """Test /api/inventory/end-clients/{client_name} endpoint"""
    
    def test_get_walmart_inventory_success(self, api_client):
        """GET /api/inventory/end-clients/Walmart - should return Walmart inventory"""
        response = api_client.get(f"{BASE_URL}/api/inventory/end-clients/Walmart")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "client_name" in data
        assert data["client_name"] == "Walmart"
        assert "stores" in data
        assert "summary" in data
        assert "regions" in data
        
        # Validate summary structure
        summary = data["summary"]
        assert "total_locations" in summary
        assert "products_tracked" in summary
        assert "locations_needing_restock" in summary
        assert "critical_stockouts" in summary
        assert "total_units_to_ship" in summary
        
        # Validate store structure
        if len(data["stores"]) > 0:
            store = data["stores"][0]
            assert "store_code" in store
            assert "store_name" in store
            assert "products" in store
            assert "needs_restock_count" in store
            assert "critical_count" in store
        
        print(f"✓ Walmart inventory: {summary['total_locations']} stores, {summary['critical_stockouts']} critical")
    
    def test_get_costco_inventory_success(self, api_client):
        """GET /api/inventory/end-clients/Costco - should return Costco inventory"""
        response = api_client.get(f"{BASE_URL}/api/inventory/end-clients/Costco")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["client_name"] == "Costco"
        assert len(data["stores"]) > 0
        
        print(f"✓ Costco inventory: {data['summary']['total_locations']} stores")
    
    def test_get_heb_inventory_success(self, api_client):
        """GET /api/inventory/end-clients/HEB - should return HEB inventory"""
        response = api_client.get(f"{BASE_URL}/api/inventory/end-clients/HEB")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["client_name"] == "HEB"
        
        print(f"✓ HEB inventory: {data['summary']['total_locations']} stores")
    
    def test_get_invalid_client_returns_404(self, api_client):
        """GET /api/inventory/end-clients/InvalidClient - should return 404"""
        response = api_client.get(f"{BASE_URL}/api/inventory/end-clients/InvalidClient")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid client returns 404 as expected")


class TestEndClientsOverview:
    """Test /api/inventory/end-clients-overview endpoint"""
    
    def test_get_end_clients_overview_success(self, api_client):
        """GET /api/inventory/end-clients-overview - should return overview of all clients"""
        response = api_client.get(f"{BASE_URL}/api/inventory/end-clients-overview")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "clients" in data
        assert "total_clients" in data
        assert "total_critical_items" in data
        assert "total_restock_items" in data
        
        assert len(data["clients"]) > 0, "Should have at least one client"
        
        # Validate client overview structure
        client = data["clients"][0]
        required_fields = ["client_name", "total_stores", "products_tracked", 
                          "items_needing_restock", "critical_stockouts", 
                          "restock_urgency", "total_units_to_ship"]
        for field in required_fields:
            assert field in client, f"Client overview should have '{field}' field"
        
        # Validate urgency values
        valid_urgencies = ["critical", "high", "normal"]
        assert client["restock_urgency"] in valid_urgencies
        
        print(f"✓ End clients overview: {data['total_clients']} clients, {data['total_critical_items']} critical items")


class TestAppointmentsCreate:
    """Test POST /api/appointments endpoint"""
    
    def test_create_appointment_success(self, api_client):
        """POST /api/appointments - should create delivery appointment"""
        params = {
            "container_number": "TEST_MSKU1234567",
            "product_sku": "ABS-750",
            "scheduled_date": "2026-02-15",
            "scheduled_time": "10:00",
            "operator_name": "Juan Pérez Test",
            "operator_license": "LIC-TEST-123456",
            "insurance_policy": "POL-TEST-2026-001",
            "truck_plates": "TEST-123-X",
            "notes": "Test appointment"
        }
        
        response = api_client.post(f"{BASE_URL}/api/appointments", params=params)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "appointment" in data
        assert "door_assignment" in data
        
        appt = data["appointment"]
        assert appt["container_number"] == params["container_number"]
        assert appt["product_sku"] == params["product_sku"]
        assert appt["operator_name"] == params["operator_name"]
        assert "assigned_door" in appt
        
        # Validate door assignment
        door_info = data["door_assignment"]
        assert "assigned_door" in door_info
        assert "zone" in door_info
        
        print(f"✓ Appointment created: Door {appt['assigned_door']} assigned")


class TestProductsCreate:
    """Test POST /api/inventory/products endpoint"""
    
    def test_create_product_success(self, api_client):
        """POST /api/inventory/products - should create new product"""
        product_data = {
            "sku": "TEST-SKU-001",
            "name": "Test Product 750ml",
            "brand": "Test Brand",
            "category": "Vodka",
            "units_per_container": 2000,
            "minimum_stock": 500,
            "maximum_stock": 3000,
            "zone_preference": "A"
        }
        
        response = api_client.post(f"{BASE_URL}/api/inventory/products", json=product_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "product" in data
        assert "assigned_positions" in data
        
        product = data["product"]
        assert product["sku"] == product_data["sku"]
        assert product["name"] == product_data["name"]
        assert product["brand"] == product_data["brand"]
        
        print(f"✓ Product created: {product['sku']} - {product['name']}")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""
    
    def test_inventory_endpoint(self, api_client):
        """GET /api/inventory - should return CEDIS inventory"""
        response = api_client.get(f"{BASE_URL}/api/inventory")
        
        assert response.status_code == 200
        data = response.json()
        assert "inventory" in data
        assert "summary" in data
        print(f"✓ Inventory: {data['summary']['total_products']} products")
    
    def test_containers_endpoint(self, api_client):
        """GET /api/containers - should return containers"""
        response = api_client.get(f"{BASE_URL}/api/containers")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Containers: {len(data)} containers")
    
    def test_dashboard_endpoint(self, api_client):
        """GET /api/dashboard - should return dashboard data"""
        response = api_client.get(f"{BASE_URL}/api/dashboard")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_containers" in data
        print(f"✓ Dashboard: {data['total_containers']} total containers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
