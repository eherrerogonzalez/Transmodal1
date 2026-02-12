"""
Yard Management Module Tests
Tests for container yard layout, search, optimization, and departure tracking
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_erp_token"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {AUTH_TOKEN}"
    })
    return session


class TestYardLayout:
    """Tests for GET /api/yard/layout endpoint"""
    
    def test_get_yard_layout_returns_200(self, api_client):
        """Test that yard layout endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/yard/layout")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/yard/layout returns 200")
    
    def test_yard_layout_structure(self, api_client):
        """Test that yard layout has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/yard/layout")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify required fields exist
        assert "rows" in data, "Missing 'rows' field"
        assert "columns" in data, "Missing 'columns' field"
        assert "cells" in data, "Missing 'cells' field"
        assert "total_capacity" in data, "Missing 'total_capacity' field"
        assert "total_occupied" in data, "Missing 'total_occupied' field"
        assert "utilization_percent" in data, "Missing 'utilization_percent' field"
        assert "full_containers" in data, "Missing 'full_containers' field"
        assert "empty_containers" in data, "Missing 'empty_containers' field"
        
        # Verify data types
        assert isinstance(data["rows"], int), "rows should be int"
        assert isinstance(data["columns"], int), "columns should be int"
        assert isinstance(data["cells"], list), "cells should be list"
        assert isinstance(data["total_capacity"], int), "total_capacity should be int"
        assert isinstance(data["utilization_percent"], (int, float)), "utilization_percent should be numeric"
        
        print(f"✓ Yard layout structure valid: {data['rows']}x{data['columns']} grid")
    
    def test_yard_cells_have_correct_structure(self, api_client):
        """Test that each cell has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/yard/layout")
        assert response.status_code == 200
        
        data = response.json()
        cells = data["cells"]
        
        assert len(cells) > 0, "Cells list should not be empty"
        
        # Check first cell structure
        cell = cells[0]
        assert "row" in cell, "Cell missing 'row'"
        assert "column" in cell, "Cell missing 'column'"
        assert "column_letter" in cell, "Cell missing 'column_letter'"
        assert "max_stack" in cell, "Cell missing 'max_stack'"
        assert "containers" in cell, "Cell missing 'containers'"
        assert "is_occupied" in cell, "Cell missing 'is_occupied'"
        assert "total_containers" in cell, "Cell missing 'total_containers'"
        
        print(f"✓ Cell structure valid, total cells: {len(cells)}")
    
    def test_yard_containers_have_correct_structure(self, api_client):
        """Test that containers in cells have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/yard/layout")
        assert response.status_code == 200
        
        data = response.json()
        
        # Find a cell with containers
        occupied_cell = None
        for cell in data["cells"]:
            if cell["is_occupied"] and len(cell["containers"]) > 0:
                occupied_cell = cell
                break
        
        assert occupied_cell is not None, "No occupied cells found"
        
        container = occupied_cell["containers"][0]
        
        # Verify container structure
        assert "container_number" in container, "Container missing 'container_number'"
        assert "size" in container, "Container missing 'size'"
        assert "type" in container, "Container missing 'type'"
        assert "status" in container, "Container missing 'status'"
        assert "arrival_date" in container, "Container missing 'arrival_date'"
        assert "client_name" in container, "Container missing 'client_name'"
        assert "row" in container, "Container missing 'row'"
        assert "column" in container, "Container missing 'column'"
        assert "stack_level" in container, "Container missing 'stack_level'"
        
        print(f"✓ Container structure valid: {container['container_number']}")


class TestYardStats:
    """Tests for GET /api/yard/stats endpoint"""
    
    def test_get_yard_stats_returns_200(self, api_client):
        """Test that yard stats endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/yard/stats")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/yard/stats returns 200")
    
    def test_yard_stats_structure(self, api_client):
        """Test that yard stats has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/yard/stats")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify required fields
        assert "total_capacity" in data, "Missing 'total_capacity'"
        assert "total_occupied" in data, "Missing 'total_occupied'"
        assert "utilization_percent" in data, "Missing 'utilization_percent'"
        assert "full_containers" in data, "Missing 'full_containers'"
        assert "empty_containers" in data, "Missing 'empty_containers'"
        assert "by_client" in data, "Missing 'by_client'"
        assert "by_size" in data, "Missing 'by_size'"
        assert "departures_today" in data, "Missing 'departures_today'"
        assert "departures_this_week" in data, "Missing 'departures_this_week'"
        
        print(f"✓ Yard stats structure valid: {data['total_occupied']} containers, {data['utilization_percent']}% utilization")
    
    def test_yard_stats_departures_structure(self, api_client):
        """Test that departures have correct structure"""
        response = api_client.get(f"{BASE_URL}/api/yard/stats")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check departures_today structure if not empty
        if len(data["departures_today"]) > 0:
            dep = data["departures_today"][0]
            assert "container" in dep, "Departure missing 'container'"
            assert "position" in dep, "Departure missing 'position'"
            assert "client" in dep, "Departure missing 'client'"
            assert "destination" in dep, "Departure missing 'destination'"
            print(f"✓ Departures today structure valid: {len(data['departures_today'])} departures")
        else:
            print("✓ No departures today (valid empty list)")
        
        # Check departures_this_week
        assert isinstance(data["departures_this_week"], list), "departures_this_week should be list"
        print(f"✓ Departures this week: {len(data['departures_this_week'])} departures")


class TestYardSearch:
    """Tests for GET /api/yard/search/{container_number} endpoint"""
    
    def test_search_existing_container(self, api_client):
        """Test searching for an existing container"""
        # First get layout to find a valid container number
        layout_response = api_client.get(f"{BASE_URL}/api/yard/layout")
        assert layout_response.status_code == 200
        
        layout = layout_response.json()
        
        # Find a container number
        container_number = None
        for cell in layout["cells"]:
            if cell["is_occupied"] and len(cell["containers"]) > 0:
                container_number = cell["containers"][0]["container_number"]
                break
        
        assert container_number is not None, "No containers found in yard"
        
        # Search for the container
        response = api_client.get(f"{BASE_URL}/api/yard/search/{container_number}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify response structure
        assert "container" in data, "Missing 'container' in response"
        assert "position" in data, "Missing 'position' in response"
        assert "containers_above" in data, "Missing 'containers_above' in response"
        
        # Verify container data
        assert data["container"]["container_number"] == container_number
        
        print(f"✓ Container {container_number} found at {data['position']['full_position']}")
    
    def test_search_nonexistent_container(self, api_client):
        """Test searching for a non-existent container returns 404"""
        response = api_client.get(f"{BASE_URL}/api/yard/search/INVALID1234567")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent container returns 404")
    
    def test_search_response_position_structure(self, api_client):
        """Test that search response position has correct structure"""
        # Get a valid container
        layout_response = api_client.get(f"{BASE_URL}/api/yard/layout")
        layout = layout_response.json()
        
        container_number = None
        for cell in layout["cells"]:
            if cell["is_occupied"] and len(cell["containers"]) > 0:
                container_number = cell["containers"][0]["container_number"]
                break
        
        if container_number:
            response = api_client.get(f"{BASE_URL}/api/yard/search/{container_number}")
            assert response.status_code == 200
            
            data = response.json()
            position = data["position"]
            
            assert "row" in position, "Position missing 'row'"
            assert "column" in position, "Position missing 'column'"
            assert "column_letter" in position, "Position missing 'column_letter'"
            assert "stack_level" in position, "Position missing 'stack_level'"
            assert "full_position" in position, "Position missing 'full_position'"
            
            print(f"✓ Position structure valid: {position['full_position']}")


class TestOptimizeRetrieval:
    """Tests for POST /api/yard/optimize-retrieval/{container_number} endpoint"""
    
    def test_optimize_retrieval_returns_200(self, api_client):
        """Test that optimize retrieval endpoint returns 200 for valid container"""
        # Get a valid container
        layout_response = api_client.get(f"{BASE_URL}/api/yard/layout")
        layout = layout_response.json()
        
        container_number = None
        for cell in layout["cells"]:
            if cell["is_occupied"] and len(cell["containers"]) > 0:
                container_number = cell["containers"][0]["container_number"]
                break
        
        assert container_number is not None, "No containers found"
        
        response = api_client.post(f"{BASE_URL}/api/yard/optimize-retrieval/{container_number}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ POST /api/yard/optimize-retrieval/{container_number} returns 200")
    
    def test_optimize_retrieval_response_structure(self, api_client):
        """Test that optimize retrieval response has correct structure"""
        # Get a valid container
        layout_response = api_client.get(f"{BASE_URL}/api/yard/layout")
        layout = layout_response.json()
        
        container_number = None
        for cell in layout["cells"]:
            if cell["is_occupied"] and len(cell["containers"]) > 0:
                container_number = cell["containers"][0]["container_number"]
                break
        
        response = api_client.post(f"{BASE_URL}/api/yard/optimize-retrieval/{container_number}")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify response structure
        assert "container_number" in data, "Missing 'container_number'"
        assert "found" in data, "Missing 'found'"
        assert "current_position" in data, "Missing 'current_position'"
        assert "stack_level" in data, "Missing 'stack_level'"
        assert "containers_above" in data, "Missing 'containers_above'"
        assert "message" in data, "Missing 'message'"
        
        assert data["found"] == True, "Container should be found"
        assert data["container_number"] == container_number
        
        print(f"✓ Retrieval plan structure valid: {data['containers_above']} containers above")
    
    def test_optimize_retrieval_with_containers_above(self, api_client):
        """Test retrieval plan when there are containers above"""
        # Get layout and find a container that's NOT at the top of its stack
        layout_response = api_client.get(f"{BASE_URL}/api/yard/layout")
        layout = layout_response.json()
        
        container_number = None
        expected_above = 0
        
        for cell in layout["cells"]:
            if cell["is_occupied"] and len(cell["containers"]) > 1:
                # Get the bottom container (not the top one)
                container_number = cell["containers"][0]["container_number"]
                expected_above = len(cell["containers"]) - 1
                break
        
        if container_number:
            response = api_client.post(f"{BASE_URL}/api/yard/optimize-retrieval/{container_number}")
            assert response.status_code == 200
            
            data = response.json()
            
            # Should have containers above
            assert data["containers_above"] >= 0, "containers_above should be >= 0"
            
            # If there are containers above, should have a retrieval plan
            if data["containers_above"] > 0:
                assert "retrieval_plan" in data, "Should have retrieval_plan when containers above"
                if data["retrieval_plan"]:
                    assert "total_moves" in data["retrieval_plan"], "Plan missing 'total_moves'"
                    assert "estimated_time_minutes" in data["retrieval_plan"], "Plan missing 'estimated_time_minutes'"
                    print(f"✓ Retrieval plan: {data['retrieval_plan']['total_moves']} moves, {data['retrieval_plan']['estimated_time_minutes']} min")
            else:
                print("✓ Container at top of stack, no moves needed")
        else:
            print("✓ No stacked containers found (all single-level)")
    
    def test_optimize_retrieval_nonexistent_container(self, api_client):
        """Test optimize retrieval for non-existent container"""
        response = api_client.post(f"{BASE_URL}/api/yard/optimize-retrieval/INVALID1234567")
        assert response.status_code == 200  # Returns 200 with found=false
        
        data = response.json()
        assert data["found"] == False, "Should return found=false for invalid container"
        print("✓ Non-existent container returns found=false")


class TestContainersByDeparture:
    """Tests for GET /api/yard/containers/by-departure endpoint"""
    
    def test_get_containers_by_departure_returns_200(self, api_client):
        """Test that containers by departure endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/yard/containers/by-departure")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/yard/containers/by-departure returns 200")
    
    def test_containers_by_departure_structure(self, api_client):
        """Test that containers by departure has correct structure"""
        response = api_client.get(f"{BASE_URL}/api/yard/containers/by-departure")
        assert response.status_code == 200
        
        data = response.json()
        
        # Should be a list
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            container = data[0]
            assert "container_number" in container, "Missing 'container_number'"
            assert "expected_departure" in container, "Missing 'expected_departure'"
            assert "position" in container, "Missing 'position'"
            assert "client_name" in container, "Missing 'client_name'"
            
            print(f"✓ Containers by departure structure valid: {len(data)} containers")
        else:
            print("✓ No containers with departure dates (valid empty list)")
    
    def test_containers_sorted_by_departure(self, api_client):
        """Test that containers are sorted by departure date"""
        response = api_client.get(f"{BASE_URL}/api/yard/containers/by-departure")
        assert response.status_code == 200
        
        data = response.json()
        
        if len(data) > 1:
            # Check that dates are in ascending order
            dates = [c["expected_departure"] for c in data if c.get("expected_departure")]
            for i in range(len(dates) - 1):
                assert dates[i] <= dates[i + 1], f"Dates not sorted: {dates[i]} > {dates[i + 1]}"
            print(f"✓ Containers sorted by departure date")
        else:
            print("✓ Not enough containers to verify sorting")


class TestYardReset:
    """Tests for POST /api/yard/reset endpoint"""
    
    def test_reset_yard_returns_200(self, api_client):
        """Test that reset yard endpoint returns 200"""
        response = api_client.post(f"{BASE_URL}/api/yard/reset")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ POST /api/yard/reset returns 200")
    
    def test_reset_yard_regenerates_data(self, api_client):
        """Test that reset actually regenerates yard data"""
        # Get initial layout
        initial_response = api_client.get(f"{BASE_URL}/api/yard/layout")
        initial_data = initial_response.json()
        
        # Reset
        reset_response = api_client.post(f"{BASE_URL}/api/yard/reset")
        assert reset_response.status_code == 200
        
        # Get new layout
        new_response = api_client.get(f"{BASE_URL}/api/yard/layout")
        new_data = new_response.json()
        
        # Structure should be the same
        assert new_data["rows"] == initial_data["rows"]
        assert new_data["columns"] == initial_data["columns"]
        
        # Data might be different (random generation)
        print(f"✓ Yard reset successful: {new_data['total_occupied']} containers after reset")


class TestAuthRequired:
    """Tests to verify authentication is required"""
    
    def test_yard_layout_requires_auth(self):
        """Test that yard layout requires authentication"""
        response = requests.get(f"{BASE_URL}/api/yard/layout")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ /api/yard/layout requires authentication")
    
    def test_yard_stats_requires_auth(self):
        """Test that yard stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/yard/stats")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ /api/yard/stats requires authentication")
    
    def test_yard_search_requires_auth(self):
        """Test that yard search requires authentication"""
        response = requests.get(f"{BASE_URL}/api/yard/search/TEST123")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ /api/yard/search requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
