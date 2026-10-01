param([switch]$Coverage)
$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$resultsPath = Join-Path $taskRoot 'test-results'
New-Item -ItemType Directory -Path $resultsPath -Force | Out-Null
$pythonPath = Join-Path $taskRoot '.venv\Scripts\python.exe'
$backendRunner = Join-Path $taskRoot 'backend\tests\run_suite.py'
if ($Coverage) { & $pythonPath $backendRunner --coverage } else { & $pythonPath $backendRunner }
$backendExit = $LASTEXITCODE
Push-Location (Join-Path $taskRoot 'frontend')
try {
    $arguments = @('--import', './tests/register-loader.mjs', '--experimental-test-isolation=none')
    if ($Coverage) { $arguments += '--experimental-test-coverage' }
    $arguments += @('--test', 'tests/*.test.mjs')
    & node @arguments *> (Join-Path $resultsPath 'frontend.txt')
    $frontendExit = $LASTEXITCODE
} finally { Pop-Location }
& $pythonPath (Join-Path $taskRoot 'backend\tests\build_test_inventory.py')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Backend exit: $backendExit; Frontend exit: $frontendExit"
Write-Host "Saved evidence: $resultsPath"
if ($backendExit -ne 0 -or $frontendExit -ne 0) { exit 1 }
