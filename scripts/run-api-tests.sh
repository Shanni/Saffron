#!/bin/bash

# Script to run all API tests for Saffron

# Colors for console output
RESET='\033[0m'
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'

echo -e "${BOLD}${MAGENTA}🌸 Saffron API Test Suite${RESET}"
echo -e "${BOLD}${MAGENTA}=======================${RESET}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is required to run these tests${RESET}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Make sure the test scripts are executable
chmod +x ./test-trade-api.js
chmod +x ./test-bridge-api.js
chmod +x ./test-unified-api.js

# Function to run a test script
run_test() {
    local script=$1
    local name=$2
    
    echo -e "${BOLD}${BLUE}Running $name...${RESET}"
    echo -e "${CYAN}----------------------------------------${RESET}"
    
    node $script
    
    local status=$?
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}$name completed successfully${RESET}"
    else
        echo -e "${RED}$name failed with exit code $status${RESET}"
    fi
    
    echo -e "${CYAN}----------------------------------------${RESET}"
    echo ""
}

# Run all test scripts
run_test "./test-unified-api.js" "Unified API Tests"
run_test "./test-trade-api.js" "Trading API Tests"
run_test "./test-bridge-api.js" "Bridge API Tests"

echo -e "${BOLD}${GREEN}🎉 All API tests completed!${RESET}"
echo ""
echo -e "${YELLOW}Note: These tests use mock data and do not make real API calls.${RESET}"
echo -e "${YELLOW}To connect to real APIs, update the implementation in the api/ directory.${RESET}"
