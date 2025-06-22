#!/bin/bash

# Check if we're in a virtual environment, if not try to activate one
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "No virtual environment detected. Trying to activate..."
    if [ -f "../venv/bin/activate" ]; then
        source ../venv/bin/activate
        echo "Virtual environment activated"
    elif [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        echo "Virtual environment activated"
    else
        echo "No virtual environment found. Using system Python..."
    fi
fi

# Try python3 first, then python
if command -v python3 &> /dev/null; then
    echo "Using python3..."
    python3 train_model.py
elif command -v python &> /dev/null; then
    echo "Using python..."
    python train_model.py
else
    echo "Error: Neither python nor python3 found in PATH"
    echo "Please install Python or check your PATH configuration"
    exit 1
fi
