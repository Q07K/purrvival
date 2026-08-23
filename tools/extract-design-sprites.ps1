param(
  [Parameter(Mandatory)] [string] $Source,
  [Parameter(Mandatory)] [string] $OutDir,
  [Parameter(Mandatory)] [object[]] $Frames
)

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$sheet = [System.Drawing.Bitmap]::FromFile($Source)
try {
  foreach ($frame in $Frames) {
    $crop = New-Object System.Drawing.Bitmap($frame.w, $frame.h)
    $g = [System.Drawing.Graphics]::FromImage($crop)
    $g.DrawImage($sheet, (New-Object System.Drawing.Rectangle(0, 0, $frame.w, $frame.h)), (New-Object System.Drawing.Rectangle($frame.x, $frame.y, $frame.w, $frame.h)), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    # 외부 배경에서 연결된 아이보리 바탕만 지운다. 밝은 털은 외곽선이 지켜준다.
    $bg = $crop.GetPixel(0, 0)
    $clear = New-Object 'bool[,]' $crop.Width, $crop.Height
    $queue = New-Object 'System.Collections.Generic.Queue[System.Drawing.Point]'
    foreach ($p in @([System.Drawing.Point]::new(0, 0), [System.Drawing.Point]::new($crop.Width - 1, 0), [System.Drawing.Point]::new(0, $crop.Height - 1), [System.Drawing.Point]::new($crop.Width - 1, $crop.Height - 1))) {
      $clear[$p.X, $p.Y] = $true; $queue.Enqueue($p)
    }
    while ($queue.Count -gt 0) {
      $p = $queue.Dequeue()
      foreach ($dxy in @(@(1,0),@(-1,0),@(0,1),@(0,-1))) {
        $nx = $p.X + $dxy[0]; $ny = $p.Y + $dxy[1]
        if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $crop.Width -or $ny -ge $crop.Height -or $clear[$nx, $ny]) { continue }
        $c = $crop.GetPixel($nx, $ny)
        $d = [Math]::Sqrt(($c.R - $bg.R) * ($c.R - $bg.R) + ($c.G - $bg.G) * ($c.G - $bg.G) + ($c.B - $bg.B) * ($c.B - $bg.B))
        if ($d -lt 105) { $clear[$nx, $ny] = $true; $queue.Enqueue([System.Drawing.Point]::new($nx, $ny)) }
      }
    }
    $minX = $crop.Width; $minY = $crop.Height; $maxX = 0; $maxY = 0
    for ($y = 0; $y -lt $crop.Height; $y++) {
      for ($x = 0; $x -lt $crop.Width; $x++) {
        $c = $crop.GetPixel($x, $y)
        # 페이지의 거의 흰 종이색은 연결 여부와 관계없이 제거한다.
        # 배/귀 안쪽(#F0E2C6)은 B가 198이라 이 범위에 들어가지 않는다.
        if ($clear[$x, $y] -or ($c.R -gt 242 -and $c.G -gt 235 -and $c.B -gt 220)) { $crop.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $c.R, $c.G, $c.B)) }
        else { $minX = [Math]::Min($minX, $x); $minY = [Math]::Min($minY, $y); $maxX = [Math]::Max($maxX, $x); $maxY = [Math]::Max($maxY, $y) }
      }
    }
    $pad = 5
    $bounds = New-Object System.Drawing.Rectangle([Math]::Max(0, $minX - $pad), [Math]::Max(0, $minY - $pad), [Math]::Min($crop.Width - [Math]::Max(0, $minX - $pad), $maxX - $minX + 1 + $pad * 2), [Math]::Min($crop.Height - [Math]::Max(0, $minY - $pad), $maxY - $minY + 1 + $pad * 2))
    $sprite = $crop.Clone($bounds, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $sprite.Save((Join-Path $OutDir $frame.name), [System.Drawing.Imaging.ImageFormat]::Png)
    $sprite.Dispose(); $crop.Dispose()
  }
} finally { $sheet.Dispose() }
