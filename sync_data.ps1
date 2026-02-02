Write-Host "[1/4] Regenerating Excel Database Kits..."
python generate_menu.py
python generate_admin_kit.py

Write-Host "[2/4] Staging all changes..."
git add .

Write-Host "[3/4] Committing to GitHub..."
git commit -m "Auto-Update: Database Kits and Application Code"

Write-Host "[4/4] Pushing to remote repository..."
git push origin main

Write-Host "SUCCESS: App and Database synced to GitHub!"
