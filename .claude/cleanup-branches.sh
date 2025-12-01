#!/bin/bash
# Branch Cleanup Script for Annos Project
# Use with caution! This will delete remote branches.

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         ANNOS BRANCH CLEANUP SCRIPT                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fetch latest from remote
echo -e "${BLUE}Fetching latest from remote...${NC}"
git fetch --prune

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "ANALYSIS: OLD CODEX BRANCHES"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Count Codex branches
CODEX_COUNT=$(git branch -r | grep -E 'origin/(codex/|.*-codex/)' | wc -l)
echo -e "${YELLOW}Found $CODEX_COUNT old Codex branches${NC}"
echo ""

if [ $CODEX_COUNT -gt 0 ]; then
    echo "Branches to be deleted:"
    echo "----------------------"
    git branch -r | grep -E 'origin/(codex/|.*-codex/)' | sed 's/origin\//  - /'
    echo ""

    read -p "$(echo -e ${RED}Delete these $CODEX_COUNT Codex branches? [y/N]: ${NC})" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        echo ""
        echo -e "${BLUE}Deleting Codex branches...${NC}"

        # Delete codex/* branches
        git branch -r | grep 'origin/codex/' | sed 's/origin\///' | while read branch; do
            echo -e "  ${RED}✗${NC} Deleting $branch"
            git push origin --delete "$branch" 2>/dev/null || echo -e "    ${YELLOW}⚠${NC} Already deleted or error"
        done

        # Delete *-codex/* branches
        git branch -r | grep -E 'origin/.*-codex/' | sed 's/origin\///' | while read branch; do
            echo -e "  ${RED}✗${NC} Deleting $branch"
            git push origin --delete "$branch" 2>/dev/null || echo -e "    ${YELLOW}⚠${NC} Already deleted or error"
        done

        echo -e "${GREEN}✓ Codex branches cleanup complete!${NC}"
    else
        echo -e "${YELLOW}Skipping Codex branches cleanup${NC}"
    fi
else
    echo -e "${GREEN}✓ No Codex branches found${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "ANALYSIS: LOCAL FEATURE BRANCHES"
echo "════════════════════════════════════════════════════════════════"
echo ""

# List local feature branches
LOCAL_FEATURES=$(git branch | grep 'feature/' | wc -l)
echo -e "${YELLOW}Found $LOCAL_FEATURES local feature branches${NC}"
echo ""

if [ $LOCAL_FEATURES -gt 0 ]; then
    git branch | grep 'feature/' | while read branch; do
        # Check if merged to main
        MERGED=$(git branch --merged main | grep "$branch" || true)

        if [ -n "$MERGED" ]; then
            echo -e "  ${GREEN}✓${NC} $branch ${YELLOW}(merged to main)${NC}"
        else
            echo -e "  ${BLUE}○${NC} $branch ${BLUE}(not merged)${NC}"
        fi
    done

    echo ""
    read -p "$(echo -e ${YELLOW}Delete merged local feature branches? [y/N]: ${NC})" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        echo ""
        echo -e "${BLUE}Deleting merged local feature branches...${NC}"

        git branch --merged main | grep 'feature/' | while read branch; do
            echo -e "  ${RED}✗${NC} Deleting $branch"
            git branch -d "$branch" 2>/dev/null || echo -e "    ${YELLOW}⚠${NC} Could not delete (maybe current branch)"
        done

        echo -e "${GREEN}✓ Local feature branches cleanup complete!${NC}"
    else
        echo -e "${YELLOW}Skipping local feature branches cleanup${NC}"
    fi
else
    echo -e "${GREEN}✓ No local feature branches found${NC}"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "SUMMARY"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Show remaining branches
echo "Protected branches (kept):"
echo "  ${GREEN}✓${NC} main"
echo "  ${GREEN}✓${NC} develop"
echo ""

# Count remaining remote branches
REMAINING_REMOTE=$(git branch -r | grep -v 'HEAD' | grep -v 'origin/main' | grep -v 'origin/develop' | wc -l)
echo -e "Remaining remote branches: ${BLUE}$REMAINING_REMOTE${NC}"

if [ $REMAINING_REMOTE -gt 0 ]; then
    echo ""
    echo "Still active:"
    git branch -r | grep -v 'HEAD' | grep -v 'origin/main' | grep -v 'origin/develop' | sed 's/origin\//  - /'
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Cleanup complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Review remaining branches above"
echo "  2. Manually delete any other old branches if needed:"
echo "     ${BLUE}git push origin --delete branch-name${NC}"
echo "  3. Update local references:"
echo "     ${BLUE}git fetch --prune${NC}"
echo ""
