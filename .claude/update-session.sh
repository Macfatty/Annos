#!/bin/bash
# Session Tracker Update Script
# Updates session-tracker.json with current timestamp

SESSION_FILE=".claude/session-tracker.json"

if [ ! -f "$SESSION_FILE" ]; then
    echo "❌ Session tracker file not found: $SESSION_FILE"
    exit 1
fi

# Get current timestamp
CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Update lastUpdated field using jq if available, otherwise sed
if command -v jq &> /dev/null; then
    # Use jq for JSON manipulation (preferred)
    jq --arg time "$CURRENT_TIME" '.lastUpdated = $time' "$SESSION_FILE" > "${SESSION_FILE}.tmp"
    mv "${SESSION_FILE}.tmp" "$SESSION_FILE"
    echo "✅ Session tracker updated with jq: $CURRENT_TIME"
else
    # Fallback to sed if jq not available
    sed -i "s/\"lastUpdated\": \".*\"/\"lastUpdated\": \"$CURRENT_TIME\"/" "$SESSION_FILE"
    echo "✅ Session tracker updated with sed: $CURRENT_TIME"
fi

# Display current session status
echo ""
echo "📊 Current Session Status:"
echo "─────────────────────────────────────────"

if command -v jq &> /dev/null; then
    TOKENS_USED=$(jq -r '.tokensUsed' "$SESSION_FILE")
    TOKENS_BUDGET=$(jq -r '.tokenBudget' "$SESSION_FILE")
    TOKENS_REMAINING=$(jq -r '.tokensRemaining' "$SESSION_FILE")
    PERCENTAGE=$(echo "scale=1; ($TOKENS_USED / $TOKENS_BUDGET) * 100" | bc)

    echo "Tokens Used:      $TOKENS_USED / $TOKENS_BUDGET"
    echo "Tokens Remaining: $TOKENS_REMAINING"
    echo "Usage:            $PERCENTAGE%"
else
    cat "$SESSION_FILE"
fi

echo "─────────────────────────────────────────"
echo ""
echo "💡 Tip: Read .claude/session-status.md for detailed session info"
