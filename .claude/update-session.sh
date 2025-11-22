#!/bin/bash
# Session Tracker Update Script (Secure Version)
# Updates session-tracker.json with current timestamp
# Security: Input validation, secure temp files, error handling

# Exit on error, undefined variables, pipe failures
set -euo pipefail

# Trap errors
trap 'echo "❌ Script failed at line $LINENO"' ERR

# Constants
readonly SESSION_FILE=".claude/session-tracker.json"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Security: Ensure script runs from project root
if [ ! -d ".claude" ]; then
    echo "❌ Error: Must run from project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: .claude/ directory should exist"
    exit 1
fi

# Security: Validate file path (no path traversal)
if [[ "$SESSION_FILE" == *..* ]]; then
    echo "❌ Security Error: Invalid file path (contains ..)"
    exit 1
fi

# Check if session file exists
if [ ! -f "$SESSION_FILE" ]; then
    echo "❌ Session tracker file not found: $SESSION_FILE"
    echo ""
    echo "💡 Initialize with template:"
    echo "   cp .claude/session-tracker.template.json .claude/session-tracker.json"
    exit 1
fi

# Security: Validate JSON structure before processing
if ! command -v jq &> /dev/null; then
    echo "⚠️  Warning: jq not installed. Install with: sudo apt-get install jq"
    echo "   Falling back to basic sed update (less secure)"

    # Get current timestamp
    CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Security: Validate timestamp format (ISO 8601)
    if [[ ! "$CURRENT_TIME" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]; then
        echo "❌ Invalid timestamp format: $CURRENT_TIME"
        exit 1
    fi

    # Fallback to sed (less safe, but works)
    sed -i.bak "s/\"lastUpdated\": \".*\"/\"lastUpdated\": \"$CURRENT_TIME\"/" "$SESSION_FILE"
    rm -f "${SESSION_FILE}.bak"

    echo "✅ Session tracker updated (sed): $CURRENT_TIME"
    cat "$SESSION_FILE"
    exit 0
fi

# Validate JSON syntax
if ! jq empty "$SESSION_FILE" 2>/dev/null; then
    echo "❌ Invalid JSON syntax in: $SESSION_FILE"
    echo "   Please fix JSON errors or restore from template"
    exit 1
fi

# Validate required fields exist
required_fields=("tokensUsed" "tokenBudget" "tokensRemaining" "lastUpdated")
for field in "${required_fields[@]}"; do
    if ! jq -e ".$field" "$SESSION_FILE" >/dev/null 2>&1; then
        echo "❌ Missing required field: $field"
        echo "   Restore from template or add missing field"
        exit 1
    fi
done

# Get current timestamp
CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Security: Validate timestamp format (ISO 8601)
if [[ ! "$CURRENT_TIME" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]; then
    echo "❌ Invalid timestamp format: $CURRENT_TIME"
    exit 1
fi

# Security: Create secure temporary file with random name
TEMP_FILE=$(mktemp "${SESSION_FILE}.XXXXXX")
if [ ! -f "$TEMP_FILE" ]; then
    echo "❌ Failed to create temporary file"
    exit 1
fi

# Ensure temp file is removed on exit
trap 'rm -f "$TEMP_FILE"' EXIT

# Update lastUpdated field using jq
if ! jq --arg time "$CURRENT_TIME" '.lastUpdated = $time' "$SESSION_FILE" > "$TEMP_FILE"; then
    echo "❌ Failed to update session file"
    exit 1
fi

# Atomically replace original file
mv "$TEMP_FILE" "$SESSION_FILE"
echo "✅ Session tracker updated: $CURRENT_TIME"

# Display current session status
echo ""
echo "📊 Current Session Status:"
echo "─────────────────────────────────────────"

# Read and validate token values
TOKENS_USED=$(jq -r '.tokensUsed' "$SESSION_FILE")
TOKENS_BUDGET=$(jq -r '.tokenBudget' "$SESSION_FILE")
TOKENS_REMAINING=$(jq -r '.tokensRemaining' "$SESSION_FILE")

# Security: Validate that values are numeric
if [[ ! "$TOKENS_USED" =~ ^[0-9]+$ ]] || [[ ! "$TOKENS_BUDGET" =~ ^[0-9]+$ ]]; then
    echo "⚠️  Invalid token values in session file"
    echo "Tokens Used:      $TOKENS_USED"
    echo "Tokens Budget:    $TOKENS_BUDGET"
    echo "Tokens Remaining: $TOKENS_REMAINING"
    PERCENTAGE="N/A"
else
    # Calculate percentage safely
    if command -v bc &> /dev/null; then
        PERCENTAGE=$(echo "scale=1; ($TOKENS_USED / $TOKENS_BUDGET) * 100" | bc 2>/dev/null || echo "N/A")
    else
        # Fallback: integer division
        PERCENTAGE=$(( (TOKENS_USED * 100) / TOKENS_BUDGET ))
    fi

    echo "Tokens Used:      $TOKENS_USED / $TOKENS_BUDGET"
    echo "Tokens Remaining: $TOKENS_REMAINING"
    echo "Usage:            $PERCENTAGE%"
fi

echo "─────────────────────────────────────────"
echo ""
echo "💡 Tip: Read .claude/session-status.md for detailed session info"

# Exit successfully
exit 0
