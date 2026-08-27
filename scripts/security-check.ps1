param(
  [switch]$Staged
)

$ErrorActionPreference = "Stop"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$forbidden = @(
  '(^|/)\.env$',
  '(^|/)\.env\.(?!example$)',
  '(^|/)(?:credentials?|secrets?)(?:\.|/|$)',
  '(^|/)app script\.txt$',
  '\.(?:pem|key|p12|pfx|zip|csv|xlsx?|docx|pdf)$'
)

$secretPatterns = [ordered]@{
  'Token de Meta'       = 'EAA[A-Za-z0-9]{20,}'
  'Token de GitHub'     = 'gh[pousr]_[A-Za-z0-9]{20,}'
  'Clave de Google API' = 'AIza[0-9A-Za-z_-]{30,}'
  'Clave privada'       = '-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'
  'Bearer fijo'         = '(?i)Bearer\s+[A-Za-z0-9._~-]{20,}'
  'JWT fijo'            = 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'
}

if ($Staged) {
  $files = @(git -C $repo diff --cached --name-only --diff-filter=ACMR)
} else {
  $files = @(
    git -C $repo ls-files
    git -C $repo ls-files --others --exclude-standard
  ) | Sort-Object -Unique
}

$findings = [System.Collections.Generic.List[string]]::new()

foreach ($relative in $files) {
  if ([string]::IsNullOrWhiteSpace($relative)) { continue }
  $normalized = $relative.Replace('\', '/')

  if ($forbidden | Where-Object { $normalized -match $_ }) {
    $findings.Add("${normalized}: archivo no permitido en el repositorio publico")
    continue
  }

  $absolute = Join-Path $repo $relative
  if (-not (Test-Path -LiteralPath $absolute -PathType Leaf)) { continue }
  if ((Get-Item -LiteralPath $absolute).Length -gt 5MB) { continue }

  $lineNumber = 0
  Get-Content -LiteralPath $absolute -ErrorAction SilentlyContinue | ForEach-Object {
    $lineNumber++
    foreach ($label in $secretPatterns.Keys) {
      if ($_ -match $secretPatterns[$label]) {
        $findings.Add("${normalized}:${lineNumber}: posible ${label}")
      }
    }
  }
}

if ($findings.Count -gt 0) {
  Write-Error ("Revision de seguridad rechazada:`n" + ($findings -join "`n"))
  exit 1
}

$scope = if ($Staged) { "staged" } else { "archivos locales" }
Write-Host "Revision de seguridad aprobada ($scope)."
