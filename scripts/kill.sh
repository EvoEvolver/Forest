#!/bin/bash

# This script kills processes listening on specified ports on macOS.
# Usage: ./kill.sh port1 [port2 ...]
# Example:
# 1) Free server port if in use
# ./kill.sh 29999

# Check if any port numbers are provided as arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 port1 [port2 ...]"
    exit 1
fi

# Loop through each provided port to find listening processes
for port in "$@"; do
    echo "Checking port $port..."
    # Use lsof to find processes listening on the port, filter for LISTEN state
    output=$(lsof -i :"$port" | grep LISTEN)
    if [ -z "$output" ]; then
        echo "No process is listening on port $port"
    else
        # Process each line of lsof output
        echo "$output" | while read line; do
            pid=$(echo "$line" | awk '{print $2}')
            echo "For port $port:"
            echo "$line"
            # Prompt user to decide whether to kill the process
            echo "Do you want to kill it? (y/n) "
            # Read from terminal explicitly to avoid pipe interference
            read choice < /dev/tty
            if [ "$choice" = "y" ]; then
                kill -9 -- "$pid" || pkill -9 -P "$pid"
                echo "Killed PID $pid"
            else
                echo "Skipped PID $pid"
            fi
        done
    fi
done