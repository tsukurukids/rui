$port = 8080
$root = $PSScriptRoot
if (-not $root) { $root = Split-Path -Parent $MyInvocation.MyCommand.Path }
Write-Host "root = $root"

$mimeTypes = @{}
$mimeTypes[".html"] = "text/html; charset=utf-8"
$mimeTypes[".css"]  = "text/css; charset=utf-8"
$mimeTypes[".js"]   = "application/javascript; charset=utf-8"
$mimeTypes[".json"] = "application/json; charset=utf-8"
$mimeTypes[".png"]  = "image/png"
$mimeTypes[".jpg"]  = "image/jpeg"
$mimeTypes[".jpeg"] = "image/jpeg"
$mimeTypes[".mp3"]  = "audio/mpeg"
$mimeTypes[".ico"]  = "image/x-icon"
$mimeTypes[".webp"] = "image/webp"
$mimeTypes[".gif"]  = "image/gif"

# Get LAN IP
$ip = ""
foreach ($a in [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())) {
    if ($a.AddressFamily -eq "InterNetwork") {
        $s = $a.ToString()
        if (-not $s.StartsWith("127.") -and -not $s.StartsWith("169.")) {
            $ip = $s; break
        }
    }
}

# TCP listener - no admin needed, binds to all interfaces
$server = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$server.Start()

Write-Host "=============================="  -ForegroundColor Cyan
Write-Host " manabi game server running!" -ForegroundColor Green
Write-Host "=============================="  -ForegroundColor Cyan
Write-Host " PC:     http://localhost:$port" -ForegroundColor White
Write-Host " Sumaho: http://${ip}:$port" -ForegroundColor Yellow
Write-Host " (Connect to same WiFi)" -ForegroundColor Gray
Write-Host " Stop: Ctrl+C" -ForegroundColor Gray
Write-Host "=============================="  -ForegroundColor Cyan

function Send-Response($stream, $status, $mime, $body) {
    $statusText = if ($status -eq 200) { "OK" } else { "Not Found" }
    $header = "HTTP/1.1 $status $statusText`r`nContent-Type: $mime`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nAccess-Control-Allow-Origin: *`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    $stream.Write($body, 0, $body.Length)
}

while ($true) {
    $client = $server.AcceptTcpClient()
    $stream = $client.GetStream()

    try {
        # Read request
        $buf = New-Object byte[] 4096
        $read = $stream.Read($buf, 0, $buf.Length)
        $requestText = [System.Text.Encoding]::ASCII.GetString($buf, 0, $read)

        # Parse first line: "GET /path HTTP/1.1"
        $firstLine = ($requestText -split "`r`n")[0]
        $parts = $firstLine -split " "
        $urlPath = if ($parts.Length -ge 2) { $parts[1] } else { "/" }

        # Remove query string
        $urlPath = ($urlPath -split "\?")[0]

        # URL decode
        $urlPath = [System.Uri]::UnescapeDataString($urlPath)

        # Default to index.html
        if ($urlPath -eq "/" -or $urlPath -eq "") { $urlPath = "/index.html" }

        # Build file path
        $relative = $urlPath.TrimStart("/").Replace("/", "\")
        $fp = Join-Path $root $relative

        Write-Host "GET $urlPath"

        if (Test-Path $fp -PathType Leaf) {
            $ext  = [System.IO.Path]::GetExtension($fp).ToLower()
            $mime = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $body = [System.IO.File]::ReadAllBytes($fp)
            Send-Response $stream 200 $mime $body
            Write-Host " -> 200 OK ($($body.Length) bytes)" -ForegroundColor Green
        } else {
            $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            Send-Response $stream 404 "text/plain" $body
            Write-Host " -> 404 $fp" -ForegroundColor Red
        }
    } catch {
        Write-Host " -> Error: $_" -ForegroundColor Red
    } finally {
        $stream.Close()
        $client.Close()
    }
}
