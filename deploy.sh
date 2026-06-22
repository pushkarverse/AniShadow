#!/bin/bash

# Exit on any error
set -e

echo "=== AniShadow Mobile VPS Deployer ==="
echo "Starting deployment at $(date)"

# 1. Pull latest code
echo "--> Pulling latest changes from Git..."
git pull

# 2. Install dependencies
echo "--> Installing dependencies..."
pnpm install

# 3. Build project
echo "--> Building AniShadow..."
pnpm build

# 4. Start or Restart with PM2
echo "--> Managing PM2 Process..."
if pm2 show ani-shadow > /dev/null 2>&1; then
  echo "--> App is already running in PM2. Restarting..."
  pm2 restart ani-shadow
else
  echo "--> Starting App for the first time in PM2..."
  pm2 start ecosystem.config.js
fi

# 5. Save PM2 state
echo "--> Saving PM2 state..."
pm2 save

echo "====================================="
echo "Deployment successful! App is running on port 3000."
echo "Check logs using: pm2 logs ani-shadow"
echo "====================================="
