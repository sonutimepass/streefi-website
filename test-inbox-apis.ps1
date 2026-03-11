#!/usr/bin/env pwsh

# Debugging/Logging Setup for Testing Branch
Write-Host "\n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     STREEFI DEBUGGING & LOGGING (Testing Branch)         ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝\n" -ForegroundColor Cyan

# Enable verbose logging for API and repository
$env:NEXT_PUBLIC_DEBUG_LOGGING = "true"
$env:NODE_DEBUG = "dynamodb,aws"

Write-Host "\nDebugging environment variables set:" -ForegroundColor Yellow
Write-Host "  NEXT_PUBLIC_DEBUG_LOGGING = $env:NEXT_PUBLIC_DEBUG_LOGGING" -ForegroundColor White
Write-Host "  NODE_DEBUG = $env:NODE_DEBUG" -ForegroundColor White

# Show current .env.local config
Write-Host "\nCurrent .env.local settings:" -ForegroundColor Yellow
try {
    $envPath = "./.env.local"
    if (Test-Path $envPath) {
        Get-Content $envPath | Select-String "AWS|DEBUG|LOG" | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
    } else {
        Write-Host "  .env.local not found" -ForegroundColor Red
    }
} catch {
    Write-Host "  Error reading .env.local: $($_.Exception.Message)" -ForegroundColor Red
}

# Show log tail instructions
Write-Host "\nTo tail logs in local dev server:" -ForegroundColor Yellow
Write-Host "  npm run dev" -ForegroundColor White
Write-Host "  # In another terminal:" -ForegroundColor White
Write-Host "  tail -f .next/logs/api.log" -ForegroundColor Gray
Write-Host "  tail -f .next/logs/repository.log" -ForegroundColor Gray

# Show log tail instructions for AWS Lambda/CloudWatch
Write-Host "\nTo tail logs in AWS CloudWatch (production):" -ForegroundColor Yellow
Write-Host "  aws logs tail /aws/lambda/streefi-api --follow" -ForegroundColor White

Write-Host "\nDebugging setup complete. Push to testing branch when ready." -ForegroundColor Green
