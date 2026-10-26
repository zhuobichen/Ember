# health-check.ps1 —— 全数据源健康自检
#
# 一次跑完，回答「现在哪些源能用、哪些登录态快过期了」。
# 只读检查，不抓数据（要看真实抓取是否成功，加 -Deep）。
#
# 用法：
#   pwsh -File scripts\health-check.ps1
#   pwsh -File scripts\health-check.ps1 -Deep      # 额外做一次真实抓取
#
# 退出码：0 全部正常 / 1 有源不可用

param([switch]$Deep)

$ErrorActionPreference = 'Continue'

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$ember = Split-Path -Parent $here
$root = Split-Path -Parent $ember
$qchat = Join-Path $root 'qchat-cli'
$skills = Join-Path $root 'zhaowen-skill'

$rows = New-Object System.Collections.Generic.List[object]
function Add-Row($name, $ok, $detail) {
  $rows.Add([pscustomobject]@{ 数据源 = $name; 状态 = $(if ($ok) { 'OK' } else { 'FAIL' }); 详情 = $detail })
}

# ── 1. QQ（OneBot 实例）──────────────────────────────────
$qqOk = 0
$qqDetail = @()
foreach ($port in 3000, 3002, 3003) {
  try {
    $r = Invoke-RestMethod -Uri "http://127.0.0.1:$port/get_login_info" -TimeoutSec 4
    $qqOk++
    $qqDetail += ("{0}:{1}" -f $r.data.nickname, $r.data.user_id)
  } catch { $qqDetail += ("{0}:不可用" -f $port) }
}
Add-Row 'QQ 消息' ($qqOk -gt 0) ("$qqOk/3 在线 — " + ($qqDetail -join ', '))

# ── 2. QQ 空间（cookie 存档）─────────────────────────────
$qzoneOk = $false
$qzoneDetail = '未检查'
if (Test-Path (Join-Path $qchat 'dist\cli.js')) {
  try {
    $logins = & node (Join-Path $qchat 'dist\cli.js') qzone logins 2>&1 | Out-String
    $uins = [regex]::Matches($logins, '\b\d{5,12}\b') | ForEach-Object { $_.Value } | Sort-Object -Unique
    $me = & node (Join-Path $qchat 'dist\cli.js') qzone me 2>&1 | Out-String
    $qzoneOk = $me -match '昵称'
    $nick = ([regex]::Match($me, '昵称:\s*(\S+)')).Groups[1].Value
    $qzoneDetail = ("存档 {0} 个 [({1})]；当前 {2}" -f $uins.Count, ($uins -join ','), $(if ($qzoneOk) { $nick } else { '不可用（cookie 可能过期，需 qce qzone login）' }))
  } catch { $qzoneDetail = "检查失败: $($_.Exception.Message)" }
} else { $qzoneDetail = 'qchat-cli 未构建（缺 dist/cli.js）' }
Add-Row 'QQ 空间' $qzoneOk $qzoneDetail

# ── 3. 微信（weflow-cli / 内置解密）───────────────────────
$wxOk = $false
$wxDetail = ''
try {
  $w = & weflow-cli sessions --json 2>&1 | Out-String
  $wxOk = $w -match '"success"\s*:\s*true'
  $wxDetail = if ($wxOk) { 'weflow-cli 可用' } else { 'weflow-cli 返回异常' }
} catch {
  if (Test-Path "$env:USERPROFILE\.weflow-cli\config.json") { $wxOk = $true; $wxDetail = '配置存在（weflow-cli 未在 PATH）' }
  else { $wxDetail = 'weflow-cli 不可用且无配置' }
}
Add-Row '微信' $wxOk $wxDetail

# ── 4. 飞书（用户令牌）──────────────────────────────────
$fsOk = $false
$fsDetail = ''
$tokFile = Join-Path $env:USERPROFILE '.lark-cli\user-token.json'
if (Test-Path $tokFile) {
  try {
    # 注意：ConvertFrom-Json 会把 ISO 时间字符串转成 [datetime]，且 Kind=Unspecified，
    # 再交给 DateTimeOffset 就会被当成本地时间（差 8 小时）。所以这里直接读原始字符串。
    $rawTok = Get-Content $tokFile -Raw
    $expStr = ([regex]::Match($rawTok, '"expires_at"\s*:\s*"([^"]+)"')).Groups[1].Value
    $exp = [datetimeoffset]::Parse($expStr, [cultureinfo]::InvariantCulture)
    $left = [math]::Round(($exp - [datetimeoffset]::UtcNow).TotalMinutes)
    if ($left -gt 0) {
      $fsOk = $true
      $fsDetail = ("令牌有效，剩余 {0} 分钟" -f $left)
    } else {
      $exp2 = $null
      try {
        $probe = & lark-cli im +chat-list --as user 2>&1 | Out-String
        $fsOk = $probe -match '"ok"\s*:\s*true'
        if ($fsOk) { $fsDetail = '已过期但刷新成功（wrapper 已续期）' }
        else { $fsDetail = ("已过期 {0} 分钟，刷新失败 — 需重新授权" -f (-$left)) }
      } catch { $fsDetail = ("已过期 {0} 分钟，lark-cli 不可用" -f (-$left)) }
    }
  } catch { $fsDetail = "token 文件解析失败: $($_.Exception.Message)" }
} else { $fsDetail = '没有 token 文件（从未授权）' }
Add-Row '飞书' $fsOk $fsDetail

# ── 5. 浏览器通道（bsk）────────────────────────────────
$bskOk = $false
$bskDetail = ''
$bskExe = if ($env:BSK_EXE) { $env:BSK_EXE } else { (Get-Command bsk -ErrorAction SilentlyContinue).Source }
if ($bskExe) {
  try {
    $st = & $bskExe browsers 2>&1 | Out-String
    $m = [regex]::Match($st, '(\w+)\s+([\d.]+)\s+([\d.]+)')
    $cnt = (@($st -split "`n" | Where-Object { $_ -match '^\w{8}\s' })).Count
    $bskOk = $cnt -gt 0
    $bskDetail = if ($bskOk) { "$cnt 个浏览器已连接" } else { '没有已连接的浏览器（扩展未连）' }
  } catch { $bskDetail = "bsk 调用失败: $($_.Exception.Message)" }
} else { $bskDetail = 'bsk 不在 PATH（贴吧/知乎不可用）' }
Add-Row '浏览器通道' $bskOk $bskDetail

# ── 6. 贴吧 / 知乎 脚本就位 ─────────────────────────────
foreach ($name in 'tieba', 'zhihu') {
  $script = Join-Path $skills "$name\scripts\$name.ps1"
  $cliJs = Join-Path $skills "$name\scripts\$name.mjs"
  $ok = (Test-Path $script) -and (Test-Path $cliJs) -and $bskOk
  Add-Row ("{0} 工具" -f $name) $ok $(if ($ok) { '脚本就位 + 浏览器通道正常' } elseif (-not (Test-Path $script)) { '脚本缺失' } else { '浏览器通道不可用' })
}

# ── 7. 深度检查：真抓一次 ───────────────────────────────
if ($Deep -and $bskOk) {
  foreach ($c in @(
      @{ n = '贴吧抓取'; p = (Join-Path $skills 'tieba\scripts\tieba.ps1'); a = @('posts', '-Kw', '显卡') },
      @{ n = '知乎抓取'; p = (Join-Path $skills 'zhihu\scripts\zhihu.ps1'); a = @('hot') }
    )) {
    try {
      $out = & pwsh -NoProfile -ExecutionPolicy Bypass -File $c.p @($c.a) 2>&1 | Out-String
      $ok = $out -match '(共|列表)\s*(\d+)'
      Add-Row $c.n $ok $(if ($ok) { '抓取成功' } else { '抓取无结果' })
    } catch { Add-Row $c.n $false "抓取异常: $($_.Exception.Message)" }
  }
}

# ── 汇总 ────────────────────────────────────────────────
Write-Host ''
Write-Host ('数据源健康检查  {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Write-Host ('─' * 78)
foreach ($r in $rows) {
  $color = if ($r.状态 -eq 'OK') { 'Green' } else { 'Red' }
  Write-Host ('  {0,-10} {1,-6} {2}' -f $r.数据源, $r.状态, $r.详情) -ForegroundColor $color
}
Write-Host ('─' * 78)

$fail = ($rows | Where-Object { $_.状态 -ne 'OK' }).Count
if ($fail -eq 0) { Write-Host '  全部正常' -ForegroundColor Green; exit 0 }
else { Write-Host ("  {0} 项异常" -f $fail) -ForegroundColor Yellow; exit 1 }
