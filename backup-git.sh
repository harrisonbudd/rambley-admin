#!/bin/bash

# Rambley - Git Backup Script
# Creates multiple backups for iron-clad version control

set -e  # Exit on any error

echo "🔄 Starting Rambley backup process..."

# Get current date for backup naming
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="../rambley-backups"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# 1. Create bundle backup (complete repository backup)
echo "📦 Creating bundle backup..."
git bundle create "$BACKUP_DIR/rambley-admin-$DATE.bundle" --all
echo "✅ Bundle backup created: rambley-admin-$DATE.bundle"

# 2. Push to all configured remotes
echo "🚀 Pushing to all remotes..."
git push origin --all
git push origin --tags

# Check if backup remote exists and push to it
if git remote | grep -q "backup"; then
    echo "📤 Pushing to backup remote..."
    git push backup --all
    git push backup --tags
else
    echo "⚠️  No backup remote configured. Run: git remote add backup <backup-repo-url>"
fi

# 3. Create local mirror backup
echo "🪞 Creating/updating local mirror..."
MIRROR_DIR="$BACKUP_DIR/rambley-admin-mirror.git"
if [ -d "$MIRROR_DIR" ]; then
    cd "$MIRROR_DIR"
    git remote update
    cd - > /dev/null
else
    git clone --mirror . "$MIRROR_DIR"
fi
echo "✅ Local mirror updated"

# 4. Export important branches as patches
echo "📄 Creating patch backups..."
PATCH_DIR="$BACKUP_DIR/patches-$DATE"
mkdir -p "$PATCH_DIR"
git format-patch origin/main --output-directory "$PATCH_DIR" > /dev/null
echo "✅ Patches created in $PATCH_DIR"

# 5. Create repository health report
echo "🏥 Creating repository health report..."
HEALTH_REPORT="$BACKUP_DIR/health-report-$DATE.txt"
{
    echo "Rambley Repository Health Report - $DATE"
    echo "=================================================="
    echo ""
    echo "Repository Status:"
    git status --porcelain
    echo ""
    echo "Branch Information:"
    git branch -vv
    echo ""
    echo "Remote Information:"
    git remote -v
    echo ""
    echo "Recent Commits:"
    git log --oneline -10
    echo ""
    echo "Repository Size:"
    du -sh .git
} > "$HEALTH_REPORT"

echo "✅ Health report created: health-report-$DATE.txt"

# 6. Clean up old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "*.bundle" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "health-report-*.txt" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "patches-*" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "🎉 Backup process completed successfully!"
echo "📁 Backups location: $BACKUP_DIR"
echo "🔗 Repository URL: $(git remote get-url origin)"
echo ""

# Display backup summary
echo "📊 Backup Summary:"
echo "- Bundle backup: ✅"
echo "- Remote push: ✅"
echo "- Local mirror: ✅"
echo "- Patch export: ✅"
echo "- Health report: ✅" 