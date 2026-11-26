# Run from the repository root only after inspecting the selected feature, setup,
# fixtures and steps and confirming that the Automation BDD runner is idle.
# Reports and traces are private: they may contain tenant data and must not be shared raw.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path 'e2e').Path
$runDir = Join-Path $root ('test-results/workflow-evaluation/run-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $runDir | Out-Null
$configName = 'playwright.workflow-eval-' + [guid]::NewGuid().ToString('N') + '.config.ts'
$configPath = Join-Path $root $configName
$original = [System.IO.File]::ReadAllText((Join-Path $root 'playwright.bdd.config.ts'))
foreach ($project in @('bdd-chromium', 'bdd-chromium-authenticated', 'bdd-chromium-org')) {
  $needle = 'name: "' + $project + '",'
  $out = (Join-Path $runDir ('generated/' + $project)).Replace('\', '/')
  if (([regex]::Matches($original, [regex]::Escape($needle))).Count -ne 1) { throw 'Unexpected config shape' }
  $original = $original.Replace($needle, ($needle + "`n                outputDir: " + ($out | ConvertTo-Json -Compress) + ','))
}
[System.IO.File]::WriteAllText($configPath, $original, [System.Text.UTF8Encoding]::new($false))
$env:CI = '1'
$env:AGGREGATE_REPORT = '1'
$env:AUTOMATION_BDD_FEATURES = '["tests/bdd/features/reports/report-templates.feature"]'
$env:AUTOMATION_SETUP_AUTH_FILE = Join-Path $runDir 'auth-state.json'
$env:AUTOMATION_OUTPUT_DIR = Join-Path $runDir 'output'
$env:AUTOMATION_REPORT_DIR = Join-Path $runDir 'html'
foreach ($name in @('AUTOMATION_SELECTED_ENV', 'AUTOMATION_STORAGE_STATE', 'AUTOMATION_LIVE_FRAME', 'AUTOMATION_EVENTS_FILE', 'AUTOMATION_AGENT_PROXY')) {
  Remove-Item -Path ('Env:' + $name) -ErrorAction SilentlyContinue
}
$filter = 'TEN_RTM_'
$expectedScenarios = @{
  TEN_RTM_LST_E2E_001 = 'Browse the report template list'
  TEN_RTM_LST_E2E_002 = 'Search without matches and reset the template list'
  TEN_RTM_LST_E2E_003 = 'Navigate between pages of report templates'
  TEN_RTM_LST_E2E_004 = 'Filter by a report name with no matches and reset'
  TEN_RTM_SAV_E2E_001 = 'See the empty saved views state'
  TEN_RTM_CRT_E2E_001 = 'Choose a Case Management report type for a new template'
  TEN_RTM_CRT_E2E_003 = 'Cancel an unchanged template creation'
  TEN_RTM_VDT_E2E_001 = 'View a template report and its configuration'
}
$sourcePaths = @(
  'playwright.bdd.config.ts', 'tests/bdd/setup/auth.setup.ts',
  'tests/bdd/features/reports/report-templates.feature', 'tests/bdd/steps/reports/report-templates.steps.ts',
  'tests/bdd/steps/reports/report-detail.steps.ts', 'tests/bdd/pages/reports/ReportTemplatesPage.ts',
  'tests/bdd/fixtures/base.fixture.ts'
)
$sourceHashes = @{}
foreach ($sourcePath in $sourcePaths) {
  $sourceHashes[$sourcePath] = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $root $sourcePath)).Hash
}
function Assert-SourceUnchanged {
  foreach ($sourcePath in $sourcePaths) {
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $root $sourcePath)).Hash -ne $sourceHashes[$sourcePath]) {
      throw 'A relevant source file changed; stop and reassess the run.'
    }
  }
}
Push-Location $root
try {
  $feature = [System.IO.File]::ReadAllText((Join-Path $root 'tests/bdd/features/reports/report-templates.feature'))
  $featureScenarios = [regex]::Matches($feature, '(?m)^\s*@(?<id>TEN_RTM_[A-Z]{3}_E2E_\d{3})[^\r\n]*\r?\n\s*Scenario:\s*(?<title>[^\r\n]+)')
  foreach ($id in $expectedScenarios.Keys) {
    $scenarioMatches = @($featureScenarios | Where-Object { $_.Groups['id'].Value -eq $id -and $_.Groups['title'].Value.Trim() -eq $expectedScenarios[$id] })
    if ($scenarioMatches.Count -ne 1 -or @($featureScenarios | Where-Object { $_.Groups['id'].Value -eq $id }).Count -ne 1) { throw 'Scenario identity changed; review the selection before running.' }
  }
  $ErrorActionPreference = 'Continue'
  & pnpm.cmd exec bddgen "--config=$configName" 1> (Join-Path $runDir 'generation.log') 2> (Join-Path $runDir 'generation.err')
  if ($LASTEXITCODE -ne 0) { Write-Output "Generation failed; diagnostics retained in isolated run directory."; exit 1 }
  Write-Output 'Generation completed in isolated directories.'
  & pnpm.cmd exec playwright test "--config=$configName" '--project=bdd-chromium-authenticated' --list "--grep=$filter" '--grep-invert=TEN_RTM_CRT_E2E_002' 1> (Join-Path $runDir 'collection.log') 2> (Join-Path $runDir 'collection.err')
  $collectExit = $LASTEXITCODE
  $lines = @(Get-Content (Join-Path $runDir 'collection.log') | Where-Object { $_ -match '^\s+\[bdd-chromium-authenticated\]' })
  $expectedTitles = @($expectedScenarios.Values)
  $matched = @($expectedTitles | Where-Object { $title = $_; @($lines | Where-Object { $_.EndsWith($title) }).Count -eq 1 })
  if ($collectExit -ne 0 -or $lines.Count -ne 8 -or $matched.Count -ne 8) { Write-Output "Collection incomplete: $($lines.Count) scenarios and $($matched.Count) expected titles; no test run started."; exit 2 }
  Write-Output 'Collection confirmed eight distinct selected IDs.'
  $runFailed = $false
  foreach ($attempt in 1..2) {
    Assert-SourceUnchanged
    $env:AUTOMATION_SETUP_AUTH_FILE = Join-Path $runDir "auth-state-$attempt.json"
    $env:AUTOMATION_OUTPUT_DIR = Join-Path $runDir "output-$attempt"
    $start = [DateTimeOffset]::UtcNow
    & pnpm.cmd exec playwright test "--config=$configName" '--project=bdd-chromium-authenticated' "--grep=$filter" '--grep-invert=TEN_RTM_CRT_E2E_002' '--reporter=json' 1> (Join-Path $runDir "run-$attempt.json") 2> (Join-Path $runDir "run-$attempt.err")
    $code = $LASTEXITCODE
    if ($code -ne 0) { $runFailed = $true }
    $end = [DateTimeOffset]::UtcNow
    [pscustomobject]@{ attempt=$attempt; exitCode=$code; startUtc=$start.ToString('o'); endUtc=$end.ToString('o'); wallSeconds=[math]::Round(($end-$start).TotalSeconds, 2) } | ConvertTo-Json | Set-Content (Join-Path $runDir "timing-$attempt.json")
    Write-Output "Attempt $attempt finished with exit code $code."
    Assert-SourceUnchanged
  }
  Write-Output ('Run artifacts: ' + $runDir)
  if ($runFailed) { exit 1 }
} finally {
  Pop-Location
  Remove-Item -LiteralPath $configPath -Force -ErrorAction SilentlyContinue
  foreach ($attempt in 1..2) {
    Remove-Item -LiteralPath (Join-Path $runDir "auth-state-$attempt.json") -Force -ErrorAction SilentlyContinue
  }
}
