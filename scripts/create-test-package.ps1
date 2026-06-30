param(
  [string]$OutputRoot = "..\Abacus testpakketten",
  [string]$PackageName = "",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$timestamp = Get-Date -Format "yyyy-MM-dd-HHmm"
if ([string]::IsNullOrWhiteSpace($PackageName)) {
  $PackageName = "Abacus-testpakket-$timestamp"
}

$resolvedOutputRoot = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath((Join-Path $repoRoot $OutputRoot))
$packagePath = Join-Path $resolvedOutputRoot $PackageName
$appPath = Join-Path $packagePath "app"

if ((Test-Path $packagePath) -and -not $Force) {
  throw "Pakket bestaat al: $packagePath. Gebruik -Force of kies een andere PackageName."
}

if (Test-Path $packagePath) {
  $resolvedPackage = Resolve-Path $packagePath
  if (-not $resolvedPackage.Path.StartsWith($resolvedOutputRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Veiligheidscontrole mislukt: pakketpad valt buiten de uitvoermap."
  }
  Remove-Item -LiteralPath $resolvedPackage.Path -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $appPath | Out-Null

Push-Location $repoRoot
try {
  npm run build -- --base=./
  Copy-Item -Path "dist\*" -Destination $appPath -Recurse -Force

  $commit = (git rev-parse --short HEAD 2>$null)
  if ([string]::IsNullOrWhiteSpace($commit)) {
    $commit = "onbekend"
  }

  Copy-Item -Path "LICENSE" -Destination (Join-Path $packagePath "LICENSE.txt") -Force

  @"
Abacus testpakket
=================

Doel
----
Dit is een losse testversie om te kopieren naar een andere Windows-pc.

Starten
-------
Dubbelklik op:

  Start Abacus.cmd

Er opent een klein zwart venster dat de app lokaal beschikbaar maakt.
Laat dat venster open zolang je Abacus gebruikt.
Sluit het venster om de testversie te stoppen.

Belangrijk
----------
- Dit is nog geen definitieve installer of .exe.
- Dit pakket is bedoeld om te testen met fictieve leergegevens.
- De echte ontwikkeling gebeurt verder in de hoofdmap.
- Gegevens worden lokaal in de browser van die pc bewaard.

Versie
------
Gemaakt op: $(Get-Date -Format "dd/MM/yyyy HH:mm")
Codeversie: $commit
"@ | Set-Content -Path (Join-Path $packagePath "LEESMIJ.txt") -Encoding UTF8

  @"
Abacus testpakket
Gemaakt op: $(Get-Date -Format "yyyy-MM-dd HH:mm")
Git commit: $commit
"@ | Set-Content -Path (Join-Path $packagePath "versie.txt") -Encoding UTF8

  @"
@echo off
title Abacus starten
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-Abacus.ps1"
"@ | Set-Content -Path (Join-Path $packagePath "Start Abacus.cmd") -Encoding ASCII

  @'
param(
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$root = Join-Path $PSScriptRoot "app"

function Get-MimeType([string]$path) {
  $extension = [IO.Path]::GetExtension($path).ToLowerInvariant()
  switch ($extension) {
    ".html" { "text/html; charset=utf-8" }
    ".js" { "text/javascript; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".png" { "image/png" }
    ".svg" { "image/svg+xml" }
    ".ico" { "image/x-icon" }
    ".txt" { "text/plain; charset=utf-8" }
    default { "application/octet-stream" }
  }
}

function Find-FreePort {
  for ($port = 8765; $port -le 8795; $port++) {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
    try {
      $listener.Start()
      $listener.Stop()
      return $port
    } catch {
      try { $listener.Stop() } catch {}
    }
  }
  throw "Geen vrije lokale poort gevonden tussen 8765 en 8795."
}

if (-not (Test-Path (Join-Path $root "index.html"))) {
  throw "De app-map is niet volledig. Maak het testpakket opnieuw."
}

$port = Find-FreePort
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
$listener.Start()
$url = "http://127.0.0.1:$port/"

Write-Host ""
Write-Host "Abacus testversie gestart."
Write-Host "Adres: $url"
Write-Host "Laat dit venster open zolang je test."
Write-Host "Sluit dit venster om Abacus te stoppen."
Write-Host ""

if (-not $NoBrowser) {
  Start-Process $url
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      while ($reader.ReadLine()) {}

      $target = "index.html"
      if ($requestLine -match "^[A-Z]+\s+([^ ]+)") {
        $rawPath = [Uri]::UnescapeDataString($Matches[1].Split("?")[0])
        $rawPath = $rawPath.TrimStart("/")
        if (-not [string]::IsNullOrWhiteSpace($rawPath)) {
          $target = $rawPath.Replace("/", [IO.Path]::DirectorySeparatorChar)
        }
      }

      $candidate = [IO.Path]::GetFullPath((Join-Path $root $target))
      $rootFull = [IO.Path]::GetFullPath($root)
      if (-not $candidate.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
        $candidate = Join-Path $root "index.html"
      }
      if (-not (Test-Path $candidate -PathType Leaf)) {
        $candidate = Join-Path $root "index.html"
      }

      $bytes = [IO.File]::ReadAllBytes($candidate)
      $mime = Get-MimeType $candidate
      $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
      $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($bytes, 0, $bytes.Length)
    } catch {
      try {
        $message = [Text.Encoding]::UTF8.GetBytes("Abacus kon dit bestand niet laden.")
        $header = "HTTP/1.1 500 Internal Server Error`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($message.Length)`r`nConnection: close`r`n`r`n"
        $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        $stream.Write($message, 0, $message.Length)
      } catch {}
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
'@ | Set-Content -Path (Join-Path $packagePath "Start-Abacus.ps1") -Encoding UTF8

  Write-Host "Testpakket gemaakt: $packagePath"
} finally {
  Pop-Location
}
