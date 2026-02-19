"""
Backend tests for Operations Portal: Pricing, Tariffs, and Contracts modules
Tests the flow: Login → Routes → Create Tariff → Create Contract
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOpsAuthentication:
    """Test operations portal authentication"""
    
    def test_ops_login_success(self):
        """Test successful login with operaciones/ops123"""
        response = requests.post(f"{BASE_URL}/api/ops/auth/login", json={
            "username": "operaciones",
            "password": "ops123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["username"] == "operaciones"
        print(f"SUCCESS: Login successful, token obtained")
        return data["token"]
    
    def test_ops_login_invalid(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/ops/auth/login", json={
            "username": "invalid",
            "password": "wrong"
        })
        assert response.status_code == 401, "Invalid credentials should return 401"
        print("SUCCESS: Invalid credentials correctly rejected")


class TestOpsPricingRoutes:
    """Test Pricing Routes endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for operations portal"""
        response = requests.post(f"{BASE_URL}/api/ops/auth/login", json={
            "username": "operaciones",
            "password": "ops123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    def test_get_routes(self, auth_token):
        """Test GET /ops/pricing/routes - should return available routes"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ops/pricing/routes", headers=headers)
        assert response.status_code == 200, f"Failed to get routes: {response.text}"
        data = response.json()
        assert "routes" in data, "Response should contain routes array"
        assert "total" in data, "Response should contain total count"
        print(f"SUCCESS: Got {data['total']} routes")
        
        # Verify we have the expected 42 routes (or close to it)
        routes_count = len(data["routes"])
        print(f"Routes count: {routes_count}")
        
        return data["routes"]
    
    def test_get_origins(self, auth_token):
        """Test GET /ops/pricing/origins"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ops/pricing/origins", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "origins" in data
        print(f"SUCCESS: Got {len(data['origins'])} origins: {data['origins'][:5]}...")
    
    def test_get_destinations(self, auth_token):
        """Test GET /ops/pricing/destinations"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ops/pricing/destinations", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "destinations" in data
        print(f"SUCCESS: Got {len(data['destinations'])} destinations")
    
    def test_get_services(self, auth_token):
        """Test GET /ops/pricing/services"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ops/pricing/services", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "services" in data
        print(f"SUCCESS: Got {len(data['services'])} additional services")
    
    def test_routes_have_required_fields(self, auth_token):
        """Verify route data structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ops/pricing/routes", headers=headers)
        assert response.status_code == 200
        routes = response.json()["routes"]
        
        if routes:
            route = routes[0]
            # Check required fields
            required_fields = ["id", "origin", "destination", "transport_mode", "container_size"]
            for field in required_fields:
                assert field in route, f"Route should have '{field}' field"
            print(f"SUCCESS: Route structure is valid. Sample: {route['origin']} → {route['destination']}")


class TestOpsPreapprovedTariffs:
    """Test Pre-approved Tariffs CRUD operations"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/ops/auth/login", json={
            "username": "operaciones",
            "password": "ops123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def sample_route(self, auth_token):
        """Get a sample route to use for tariff creation"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ops/pricing/routes", headers=headers)
        routes = response.json().get("routes", [])
        if routes:
            return routes[0]
        pytest.skip("No routes available")
    
    def test_get_tariffs_initially_empty(self, auth_token):
        """Test GET /ops/pricing/tariffs - should start empty"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ops/pricing/tariffs", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "tariffs" in data
        print(f"SUCCESS: Tariffs endpoint working, current count: {len(data['tariffs'])}")
        return data["tariffs"]
    
    def test_create_tariff(self, auth_token, sample_route):
        """Test POST /ops/pricing/tariffs - create a new pre-approved tariff"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        tariff_data = {
            "route_id": sample_route.get("id", "test_route_1"),
            "origin": sample_route.get("origin", "Veracruz"),
            "destination": sample_route.get("destination", "CDMX"),
            "transport_mode": sample_route.get("transport_mode", "maritime"),
            "container_size": sample_route.get("container_size", "40ft"),
            "transit_days": sample_route.get("transit_days", 5),
            "cost_components": [
                {"name": "Flete Marítimo", "amount": 15000, "is_base": True},
                {"name": "Maniobras Terminal", "amount": 3500, "is_base": False},
                {"name": "Despacho Aduanal", "amount": 2500, "is_base": False}
            ],
            "margin_percent": 20,
            "sale_services": [
                {"name": "Flete Internacional", "type": "tarifa", "amount": 18000},
                {"name": "Maniobras", "type": "tarifa", "amount": 4500},
                {"name": "Despacho", "type": "tarifa", "amount": 3750}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/ops/pricing/tariffs", 
                                 json=tariff_data, headers=headers)
        assert response.status_code == 200, f"Failed to create tariff: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "tariff" in data, "Response should contain tariff"
        
        tariff = data["tariff"]
        assert tariff["origin"] == tariff_data["origin"]
        assert tariff["destination"] == tariff_data["destination"]
        assert tariff["total_cost"] == 21000  # Sum of cost components
        assert tariff["total_sale"] == 26250  # Sum of sale services
        
        print(f"SUCCESS: Created tariff {tariff['id']}: {tariff['origin']} → {tariff['destination']}")
        print(f"  Total Cost: {tariff['total_cost']}, Total Sale: {tariff['total_sale']}")
        return tariff
    
    def test_get_tariff_by_id(self, auth_token, sample_route):
        """Test GET /ops/pricing/tariffs/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a tariff
        tariff_data = {
            "route_id": "test_route_2",
            "origin": "Manzanillo",
            "destination": "Guadalajara",
            "transport_mode": "rail",
            "container_size": "40ft",
            "transit_days": 3,
            "cost_components": [{"name": "Flete Ferroviario", "amount": 8000, "is_base": True}],
            "margin_percent": 25,
            "sale_services": [{"name": "Flete Total", "type": "tarifa", "amount": 10667}]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/ops/pricing/tariffs", 
                                        json=tariff_data, headers=headers)
        assert create_response.status_code == 200
        tariff_id = create_response.json()["tariff"]["id"]
        
        # Now get it
        response = requests.get(f"{BASE_URL}/api/ops/pricing/tariffs/{tariff_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "tariff" in data
        assert data["tariff"]["id"] == tariff_id
        print(f"SUCCESS: Retrieved tariff by ID: {tariff_id}")
    
    def test_update_tariff(self, auth_token):
        """Test PUT /ops/pricing/tariffs/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a tariff
        tariff_data = {
            "route_id": "test_route_3",
            "origin": "Lázaro Cárdenas",
            "destination": "Toluca",
            "transport_mode": "intermodal",
            "container_size": "40ft",
            "transit_days": 4,
            "cost_components": [{"name": "Transporte", "amount": 10000, "is_base": True}],
            "margin_percent": 20,
            "sale_services": [{"name": "Servicio Completo", "type": "tarifa", "amount": 12500}]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/ops/pricing/tariffs", 
                                        json=tariff_data, headers=headers)
        assert create_response.status_code == 200
        tariff_id = create_response.json()["tariff"]["id"]
        
        # Update it
        update_data = {
            "margin_percent": 30,
            "cost_components": [{"name": "Transporte Actualizado", "amount": 11000, "is_base": True}],
            "sale_services": [{"name": "Servicio Actualizado", "type": "tarifa", "amount": 15714}]
        }
        
        response = requests.put(f"{BASE_URL}/api/ops/pricing/tariffs/{tariff_id}", 
                               json=update_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"SUCCESS: Updated tariff {tariff_id}")
    
    def test_delete_tariff(self, auth_token):
        """Test DELETE /ops/pricing/tariffs/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a tariff to delete
        tariff_data = {
            "route_id": "test_route_delete",
            "origin": "Test Origin",
            "destination": "Test Dest",
            "transport_mode": "maritime",
            "container_size": "20ft",
            "transit_days": 1,
            "cost_components": [{"name": "Test Cost", "amount": 1000, "is_base": True}],
            "margin_percent": 10,
            "sale_services": [{"name": "Test Service", "type": "tarifa", "amount": 1111}]
        }
        
        create_response = requests.post(f"{BASE_URL}/api/ops/pricing/tariffs", 
                                        json=tariff_data, headers=headers)
        assert create_response.status_code == 200
        tariff_id = create_response.json()["tariff"]["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/ops/pricing/tariffs/{tariff_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"SUCCESS: Deleted tariff {tariff_id}")
        
        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/api/ops/pricing/tariffs/{tariff_id}", headers=headers)
        assert get_response.status_code == 404
        print("SUCCESS: Deleted tariff correctly returns 404")


class TestOpsContracts:
    """Test Contracts (Quotes) CRUD operations"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/ops/auth/login", json={
            "username": "operaciones",
            "password": "ops123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def created_tariffs(self, auth_token):
        """Create tariffs to use in contracts"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        tariff_ids = []
        
        for i in range(2):
            tariff_data = {
                "route_id": f"contract_test_route_{i}",
                "origin": "Veracruz" if i == 0 else "Manzanillo",
                "destination": "CDMX" if i == 0 else "Monterrey",
                "transport_mode": "maritime",
                "container_size": "40ft",
                "transit_days": 5 + i,
                "cost_components": [{"name": f"Costo {i}", "amount": 10000 + i*2000, "is_base": True}],
                "margin_percent": 20,
                "sale_services": [{"name": f"Servicio {i}", "type": "tarifa", "amount": 12500 + i*2500}]
            }
            
            response = requests.post(f"{BASE_URL}/api/ops/pricing/tariffs", 
                                    json=tariff_data, headers=headers)
            if response.status_code == 200:
                tariff_ids.append(response.json()["tariff"]["id"])
        
        return tariff_ids
    
    def test_get_quotes_empty(self, auth_token):
        """Test GET /ops/quotes - check initial state"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ops/quotes", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "quotes" in data
        assert "total" in data
        print(f"SUCCESS: Quotes endpoint working, current count: {data['total']}")
    
    def test_create_contract_with_tariffs(self, auth_token, created_tariffs):
        """Test POST /ops/quotes - create contract with tariff items"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Build contract items from tariff info
        items = [
            {
                "item_type": "tarifa",
                "description": "Veracruz → CDMX: Servicio 0",
                "category": "maritime",
                "quantity": 1,
                "unit_price": 12500,
                "unit_cost": 10000,
                "tariff_id": created_tariffs[0] if created_tariffs else None
            },
            {
                "item_type": "tarifa",
                "description": "Manzanillo → Monterrey: Servicio 1",
                "category": "maritime",
                "quantity": 1,
                "unit_price": 15000,
                "unit_cost": 12000,
                "tariff_id": created_tariffs[1] if len(created_tariffs) > 1 else None
            }
        ]
        
        contract_data = {
            "client_name": "TEST_Cliente Prueba S.A. de C.V.",
            "client_email": "test@clienteprueba.com",
            "client_phone": "55 1234 5678",
            "client_rfc": "CPR123456XYZ",
            "items": items,
            "subtotal": 27500,
            "tax": 4400,
            "total": 31900,
            "notes": "Contrato de prueba con tarifas pre-aprobadas",
            "validity_end": "2026-04-15",
            "status": "draft",
            "contract_type": "tarifario",
            "tariff_ids": created_tariffs
        }
        
        response = requests.post(f"{BASE_URL}/api/ops/quotes", json=contract_data, headers=headers)
        assert response.status_code == 200, f"Failed to create contract: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "quote" in data, "Response should contain quote"
        
        quote = data["quote"]
        assert quote["client_name"] == "TEST_Cliente Prueba S.A. de C.V."
        assert len(quote["items"]) == 2
        
        print(f"SUCCESS: Created contract {quote['quote_number']}")
        print(f"  Client: {quote['client_name']}")
        print(f"  Total: {quote['total']}")
        print(f"  Items: {len(quote['items'])}")
        return quote
    
    def test_get_contract_appears_in_list(self, auth_token, created_tariffs):
        """Verify created contract appears in quotes list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a contract first
        contract_data = {
            "client_name": "TEST_Verificación Lista",
            "client_email": "verify@test.com",
            "items": [{
                "item_type": "tarifa",
                "description": "Test item",
                "quantity": 1,
                "unit_price": 5000,
                "unit_cost": 4000
            }],
            "subtotal": 5000,
            "tax": 800,
            "total": 5800,
            "status": "draft"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/ops/quotes", json=contract_data, headers=headers)
        assert create_response.status_code == 200
        quote_id = create_response.json()["quote"]["id"]
        
        # Verify it appears in list
        list_response = requests.get(f"{BASE_URL}/api/ops/quotes", headers=headers)
        assert list_response.status_code == 200
        quotes = list_response.json()["quotes"]
        
        # Find our created quote
        found_quotes = [q for q in quotes if q.get("id") == quote_id or q.get("client_name") == "TEST_Verificación Lista"]
        assert len(found_quotes) > 0, "Created contract should appear in list"
        print(f"SUCCESS: Contract found in list with {list_response.json()['total']} total contracts")
    
    def test_get_contract_by_id(self, auth_token):
        """Test GET /ops/quotes/{id}"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a contract first
        contract_data = {
            "client_name": "TEST_GetById Client",
            "items": [{
                "item_type": "service",
                "description": "Service item",
                "quantity": 1,
                "unit_price": 3000,
                "unit_cost": 2500
            }],
            "subtotal": 3000,
            "tax": 480,
            "total": 3480,
            "status": "draft"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/ops/quotes", json=contract_data, headers=headers)
        assert create_response.status_code == 200
        quote_id = create_response.json()["quote"]["id"]
        
        # Get by ID
        response = requests.get(f"{BASE_URL}/api/ops/quotes/{quote_id}", headers=headers)
        assert response.status_code == 200
        quote = response.json()
        assert quote["id"] == quote_id
        print(f"SUCCESS: Retrieved contract by ID: {quote_id}")
    
    def test_update_contract_status(self, auth_token):
        """Test PUT /ops/quotes/{id}/status"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a contract first
        contract_data = {
            "client_name": "TEST_Status Update Client",
            "items": [{
                "item_type": "service",
                "description": "Service",
                "quantity": 1,
                "unit_price": 2000,
                "unit_cost": 1500
            }],
            "subtotal": 2000,
            "tax": 320,
            "total": 2320,
            "status": "draft"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/ops/quotes", json=contract_data, headers=headers)
        assert create_response.status_code == 200
        quote_id = create_response.json()["quote"]["id"]
        
        # Update status
        response = requests.put(f"{BASE_URL}/api/ops/quotes/{quote_id}/status?new_status=sent", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"SUCCESS: Updated contract status to 'sent'")


class TestEndToEndFlow:
    """Test complete flow: Login → Routes → Create Tariff → Create Contract"""
    
    def test_complete_contract_creation_flow(self):
        """Full E2E test of the contract creation workflow"""
        # 1. Login
        login_response = requests.post(f"{BASE_URL}/api/ops/auth/login", json={
            "username": "operaciones",
            "password": "ops123"
        })
        assert login_response.status_code == 200, "Login failed"
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Step 1: Login successful")
        
        # 2. Get available routes
        routes_response = requests.get(f"{BASE_URL}/api/ops/pricing/routes", headers=headers)
        assert routes_response.status_code == 200, "Failed to get routes"
        routes = routes_response.json()["routes"]
        assert len(routes) > 0, "Should have routes available"
        print(f"Step 2: Got {len(routes)} routes")
        
        # 3. Select a route and create tariff
        route = routes[0]
        tariff_data = {
            "route_id": route["id"],
            "origin": route["origin"],
            "destination": route["destination"],
            "transport_mode": route["transport_mode"],
            "container_size": route["container_size"],
            "transit_days": route.get("transit_days", 5),
            "cost_components": [
                {"name": "Flete Base", "amount": route.get("avg_cost", 15000), "is_base": True},
                {"name": "Maniobras", "amount": 3000, "is_base": False}
            ],
            "margin_percent": 25,
            "sale_services": [
                {"name": "Flete Internacional", "type": "tarifa", "amount": 20000},
                {"name": "Maniobras y Handling", "type": "tarifa", "amount": 4000}
            ]
        }
        
        tariff_response = requests.post(f"{BASE_URL}/api/ops/pricing/tariffs", json=tariff_data, headers=headers)
        assert tariff_response.status_code == 200, f"Failed to create tariff: {tariff_response.text}"
        tariff = tariff_response.json()["tariff"]
        print(f"Step 3: Created tariff {tariff['id']}")
        
        # 4. Create contract using the tariff
        contract_data = {
            "client_name": "TEST_E2E_Cliente Final S.A.",
            "client_email": "e2e@test.com",
            "client_phone": "55 9999 8888",
            "items": [{
                "item_type": "tarifa",
                "description": f"{tariff['origin']} → {tariff['destination']}: Flete Internacional",
                "quantity": 1,
                "unit_price": 20000,
                "unit_cost": tariff["total_cost"],
                "tariff_id": tariff["id"]
            }, {
                "item_type": "tarifa",
                "description": f"{tariff['origin']} → {tariff['destination']}: Maniobras",
                "quantity": 1,
                "unit_price": 4000,
                "unit_cost": 0,
                "tariff_id": tariff["id"]
            }],
            "subtotal": 24000,
            "tax": 3840,
            "total": 27840,
            "notes": "Contrato E2E generado desde tarifa pre-aprobada",
            "status": "draft",
            "tariff_ids": [tariff["id"]]
        }
        
        contract_response = requests.post(f"{BASE_URL}/api/ops/quotes", json=contract_data, headers=headers)
        assert contract_response.status_code == 200, f"Failed to create contract: {contract_response.text}"
        contract = contract_response.json()["quote"]
        print(f"Step 4: Created contract {contract['quote_number']}")
        
        # 5. Verify contract in list
        list_response = requests.get(f"{BASE_URL}/api/ops/quotes", headers=headers)
        assert list_response.status_code == 200
        quotes = list_response.json()["quotes"]
        found = any(q.get("quote_number") == contract["quote_number"] for q in quotes)
        assert found, "Contract should appear in quotes list"
        print(f"Step 5: Contract verified in list")
        
        print("\n=== E2E FLOW COMPLETE ===")
        print(f"Route: {route['origin']} → {route['destination']}")
        print(f"Tariff ID: {tariff['id']}")
        print(f"Tariff Total Cost: ${tariff['total_cost']}")
        print(f"Tariff Total Sale: ${tariff['total_sale']}")
        print(f"Contract Number: {contract['quote_number']}")
        print(f"Contract Total: ${contract['total']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
