#!/bin/bash
# Production Verification Script for AZLOAD Backend
# Verifies all components are working correctly

echo "🔍 AZLOAD Production Verification Starting..."
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check service status
check_service() {
    local service_name=$1
    local expected_status=$2
    
    echo -e "${BLUE}Checking $service_name...${NC}"
    
    if systemctl is-active --quiet $service_name; then
        echo -e "${GREEN}✅ $service_name is running${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name is not running${NC}"
        return 1
    fi
}

# Function to check API endpoint
check_api_endpoint() {
    local url=$1
    local description=$2
    
    echo -e "${BLUE}Testing $description...${NC}"
    
    if curl -s -f "$url" > /dev/null; then
        echo -e "${GREEN}✅ $description is responding${NC}"
        return 0
    else
        echo -e "${RED}❌ $description is not responding${NC}"
        return 1
    fi
}

# Function to check port
check_port() {
    local port=$1
    local description=$2
    
    echo -e "${BLUE}Checking port $port ($description)...${NC}"
    
    if ss -tlnp | grep -q ":$port "; then
        echo -e "${GREEN}✅ Port $port is bound and listening${NC}"
        return 0
    else
        echo -e "${RED}❌ Port $port is not bound${NC}"
        return 1
    fi
}

# Initialize counters
PASSED=0
FAILED=0
TOTAL_CHECKS=0

# Check system services
echo -e "\n${YELLOW}=== SYSTEM SERVICES ===${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 3))

if check_service "azload-ml"; then PASSED=$((PASSED + 1)); else FAILED=$((FAILED + 1)); fi
if check_service "nginx"; then PASSED=$((PASSED + 1)); else FAILED=$((FAILED + 1)); fi
if check_service "postgresql"; then PASSED=$((PASSED + 1)); else FAILED=$((FAILED + 1)); fi

# Check ports
echo -e "\n${YELLOW}=== PORT AVAILABILITY ===${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 3))

if check_port "8000" "ML API"; then PASSED=$((PASSED + 1)); else FAILED=$((FAILED + 1)); fi
if check_port "80" "HTTP"; then PASSED=$((PASSED + 1)); else FAILED=$((FAILED + 1)); fi
if check_port "5432" "PostgreSQL"; then PASSED=$((PASSED + 1)); else FAILED=$((FAILED + 1)); fi

# Check API endpoints
echo -e "\n${YELLOW}=== API ENDPOINTS ===${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 5))

if check_api_endpoint "http://localhost:8000/health" "ML API Health"; then PASSED=$((PASSED + 1)); else FAILED=$((FAILED + 1)); fi
if check_api_endpoint "http://localhost:8000/model-info" "ML Model Info"; then PASSED=$((PASSED + 1)); else FAILED=$((FAILED + 1)); fi
if check_api_endpoint "http://localhost:8000/ml-pipeline/status" "ML Pipeline Status"; then PASSED=$((PASSED + 1)); else FAILED=$((FAILED + 1)); fi
if check_api_endpoint "http://localhost/" "Frontend"; then PASSED=$((PASSED + 1)); else FAILED=$((FAILED + 1)); fi
if check_api_endpoint "http://localhost/health" "Public Health Check"; then PASSED=$((PASSED + 1)); else FAILED=$((FAILED + 1)); fi

# Check ML models
echo -e "\n${YELLOW}=== ML MODELS ===${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 2))

if [ -d "/opt/azload/ml_pipeline/trained_models" ] && [ "$(ls -A /opt/azload/ml_pipeline/trained_models)" ]; then
    echo -e "${GREEN}✅ ML models are present${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ ML models are missing${NC}"
    FAILED=$((FAILED + 1))
fi

if [ -f "/opt/azload/ml_pipeline/trained_models/training_metadata.json" ]; then
    echo -e "${GREEN}✅ Training metadata is present${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ Training metadata is missing${NC}"
    FAILED=$((FAILED + 1))
fi

# Check database connectivity
echo -e "\n${YELLOW}=== DATABASE CONNECTIVITY ===${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

if pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is accepting connections${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ PostgreSQL is not accepting connections${NC}"
    FAILED=$((FAILED + 1))
fi

# Check file permissions
echo -e "\n${YELLOW}=== FILE PERMISSIONS ===${NC}"
TOTAL_CHECKS=$((TOTAL_CHECKS + 2))

if [ -x "/opt/azload/ml_pipeline/api_server.py" ]; then
    echo -e "${GREEN}✅ API server is executable${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ API server is not executable${NC}"
    FAILED=$((FAILED + 1))
fi

if [ -r "/opt/azload/ml_pipeline/requirements.txt" ]; then
    echo -e "${GREEN}✅ Requirements file is readable${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}❌ Requirements file is not readable${NC}"
    FAILED=$((FAILED + 1))
fi

# Final summary
echo -e "\n${YELLOW}=== VERIFICATION SUMMARY ===${NC}"
echo "==========================================="
echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

SUCCESS_RATE=$((PASSED * 100 / TOTAL_CHECKS))
echo -e "Success Rate: $SUCCESS_RATE%"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL CHECKS PASSED - PRODUCTION READY!${NC}"
    echo -e "${GREEN}✅ AZLOAD Backend is 100% operational${NC}"
    exit 0
elif [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "\n${YELLOW}⚠️  MOSTLY READY - Minor issues detected${NC}"
    echo -e "${YELLOW}Success rate: $SUCCESS_RATE% (>90% threshold met)${NC}"
    exit 1
else
    echo -e "\n${RED}❌ CRITICAL ISSUES DETECTED${NC}"
    echo -e "${RED}Success rate: $SUCCESS_RATE% (below 90% threshold)${NC}"
    echo -e "${RED}Please resolve failed checks before production deployment${NC}"
    exit 2
fi
