<#
.SYNOPSIS
  يشغّل خادماً محلياً بسيطاً لتطبيق «القرآن بالأوامر الصوتية» على ويندوز.

.DESCRIPTION
  واجهة التعرّف على الكلام (Web Speech API) والميكروفون لا يعملان من
  الملف المباشر file://... لذلك نحتاج لخادم محلي. http://localhost يُعتبر
  «سياقاً آمناً» في المتصفح، فيسمح باستخدام الميكروفون دون شهادات SSL.

.EXAMPLE
  .\serve.ps1
  ثم افتح المتصفح على: http://localhost:8080
#>

param(
    [int]$Port = 8080,
    [string]$Browser = 'chrome'
)

$root = $PSScriptRoot
$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.wav'  = 'audio/wav'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.ico'  = 'image/x-icon'
}

$url = "http://localhost:$Port/"

try {
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($url)
    $listener.Start()
} catch {
    Write-Host "تعذّر تشغيل الخادم على المنفذ $Port" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "جرّب منفذاً آخر: .\serve.ps1 -Port 8081" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "  القرآن بالأوامر الصوتية" -ForegroundColor Green
Write-Host "  الخادم يعمل على: $url" -ForegroundColor Cyan
Write-Host "  اضغط Ctrl+C لإيقاف الخادم."
Write-Host ""

# فتح المتصفح تلقائياً
switch ($Browser) {
    'chrome' { Start-Process 'chrome.exe' $url -ErrorAction SilentlyContinue }
    'edge'   { Start-Process 'msedge.exe' $url -ErrorAction SilentlyContinue }
    default  { Start-Process $url }
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $res = $ctx.Response

        try {
            $path = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath)
            if ($path -eq '/') { $path = '/index.html' }

            # منع الخروج عن مجلد المشروع (Path Traversal)
            $full = [System.IO.Path]::GetFullPath((Join-Path $root $path.TrimStart('/')))
            if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
                $res.StatusCode = 403
                $res.Close()
                continue
            }

            if (Test-Path -LiteralPath $full -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($full)
                $ext = [System.IO.Path]::GetExtension($full).ToLower()

                $res.StatusCode = 200
                $res.ContentType = $mime[$ext]
                if ($ext -eq '.wav') {
                    # دعم البث (Range requests) حتى يعمل زر التشغيل بسلاسة
                    $res.Headers.Add('Accept-Ranges', 'bytes')
                }
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
                $res.StatusCode = 404
                $res.ContentType = 'text/plain; charset=utf-8'
                $res.OutputStream.Write($msg, 0, $msg.Length)
            }
        } catch {
            Write-Host "خطأ: $($_.Exception.Message)" -ForegroundColor Yellow
        } finally {
            $res.OutputStream.Close()
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
