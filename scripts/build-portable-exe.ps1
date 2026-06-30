$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$tempOutput = Join-Path $env:TEMP "abacus-electron-release"
$releasePath = Join-Path $repoRoot "release"

Push-Location $repoRoot
try {
  if (Test-Path $tempOutput) {
    Remove-Item -LiteralPath $tempOutput -Recurse -Force
  }

  npm run build -- --base=./
  npx electron-builder --win portable --x64 --config.directories.output="$tempOutput"

  $repoResolved = (Resolve-Path $repoRoot).Path
  if (Test-Path $releasePath) {
    $releaseResolved = (Resolve-Path $releasePath).Path
    if (-not $releaseResolved.StartsWith($repoResolved, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Releasepad valt buiten de repository."
    }
    Remove-Item -LiteralPath $releaseResolved -Recurse -Force
  }

  New-Item -ItemType Directory -Force -Path $releasePath | Out-Null
  Copy-Item -Path (Join-Path $tempOutput "*.exe") -Destination $releasePath -Force

  $artifact = Get-ChildItem -Path $releasePath -Filter "*.exe" | Select-Object -First 1
  if (-not $artifact) {
    throw "Geen portable exe gevonden na het bouwen."
  }

  Write-Host "Portable exe gemaakt: $($artifact.FullName)"
} finally {
  Pop-Location
}
