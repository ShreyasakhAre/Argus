$sourceDir = "c:\Users\Sakha\OneDrive\Desktop\Final_Argus\Final_Argus\argus\argus"
$destDir = "C:\Argus_Dev"

Write-Host "Creating destination directory: $destDir"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Write-Host "Copying files from $sourceDir to $destDir..."
# Copy everything excluding the problematic directories
robocopy $sourceDir $destDir /E /XD .next node_modules .venv .git /XF .env.local

Write-Host ""
Write-Host "================================================================="
Write-Host "Project successfully copied to: $destDir"
Write-Host "================================================================="
Write-Host "Please do the following:"
Write-Host "1. Close this VS Code window."
Write-Host "2. Open the new folder in VS Code: C:\Argus_Dev"
Write-Host "3. Open a new terminal and run: npm install"
Write-Host "4. I (Antigravity) will continue the task in the new workspace."
Write-Host "================================================================="
