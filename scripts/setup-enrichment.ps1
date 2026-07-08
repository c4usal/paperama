$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path "$Root/vendor")) {
    New-Item -ItemType Directory -Path "$Root/vendor" | Out-Null
}

if (-not (Test-Path "$Root/vendor/sumy")) {
    Write-Host "Cloning sumy..."
    git clone --depth 1 https://github.com/miso-belica/sumy "$Root/vendor/sumy"
}

if (-not (Test-Path "$Root/vendor/crawl4ai")) {
    Write-Host "Cloning crawl4ai..."
    git clone --depth 1 https://github.com/unclecode/crawl4ai "$Root/vendor/crawl4ai"
}

$Venv = "$Root/services/enrichment/.venv"
if (-not (Test-Path $Venv)) {
    Write-Host "Creating Python venv..."
    python -m venv $Venv
}

Write-Host "Installing enrichment dependencies..."
& "$Venv/Scripts/python.exe" -m pip install --upgrade pip
& "$Venv/Scripts/python.exe" -m pip install -e "$Root/vendor/sumy"
& "$Venv/Scripts/python.exe" -m pip install -r "$Root/services/enrichment/requirements.txt"
& "$Venv/Scripts/python.exe" -m playwright install chromium
& "$Venv/Scripts/python.exe" -c "import nltk; nltk.download('punkt'); nltk.download('punkt_tab')"

Write-Host ""
Write-Host "Done. Start with:"
Write-Host "  npm run enrichment:dev"
