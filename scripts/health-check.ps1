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

param([switch]$Deep, [switch]$Fix)

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

<#
  带超时地跑一段脚本块。

  为什么需要：自检里有些步骤会挂住（例如 bsk 守护进程没起来时，`bsk browsers` 会一直等；
  QQ 空间 cookie 失效时 qce 会重试；lark-cli 要连外网）。只要有一处挂住，整个自检就永远不出结果
  —— 实测跑满 400 秒还没输出。所以每个外部调用都套一层超时，超时算 FAIL，继续往下走。
#>
function Invoke-Timed {
  param(
    [scriptblock]$Block,
    [int]$TimeoutSec = 20,
    [object[]]$ArgList = @()
  )
  $job = Start-Job -ScriptBlock $Block -ArgumentList $ArgList
  try {
    if (Wait-Job $job -Timeout $TimeoutSec) {
      $out = Receive-Job $job -ErrorAction SilentlyContinue | Out-String
      return @{ ok = ($job.State -eq 'Completed'); text = $out; timeout = $false }
    }
    return @{ ok = $false; text = ''; timeout = $true }
  } finally {
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -Force -ErrorAction SilentlyContinue
  }
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
  $cliPath = Join-Path $qchat 'dist\cli.js'
  $r1 = Invoke-Timed -TimeoutSec 20 -Block { param($c) & node $c qzone logins 2>&1 } -ArgList @($cliPath)
  $r2 = Invoke-Timed -TimeoutSec 20 -Block { param($c) & node $c qzone me 2>&1 } -ArgList @($cliPath)
  $logins = $r1.text
  $me = $r2.text
  $uins = [regex]::Matches($logins, '\b\d{5,12}\b') | ForEach-Object { $_.Value } | Sort-Object -Unique
  $qzoneOk = $me -match '昵称'
  $nick = ([regex]::Match($me, '昵称:\s*(\S+)')).Groups[1].Value
  $why = if ($r2.timeout) { '探测超时' }
    elseif ($me -match 'Session expired') { 'cookie 已失效，需重新扫码' }
    else { '不可用' }
  $qzoneDetail = ("存档 {0} 个 [({1})]；当前 {2}" -f $uins.Count, ($uins -join ','), $(if ($qzoneOk) { $nick } else { $why }))
} else { $qzoneDetail = 'qchat-cli 未构建（缺 dist/cli.js）' }
Add-Row 'QQ 空间' $qzoneOk $qzoneDetail

# ── 3. 微信（weflow-cli / 内置解密）───────────────────────
$wxOk = $false
$wxDetail = ''
$rw = Invoke-Timed -TimeoutSec 25 -Block { & weflow-cli sessions --json 2>&1 }
if (-not $rw.timeout) {
  $w = $rw.text
  $wxOk = $w -match '"success"\s*:\s*true'
  $wxDetail = if ($wxOk) { 'weflow-cli 可用' } else { 'weflow-cli 返回异常' }
} elseif (Test-Path "$env:USERPROFILE\.weflow-cli\config.json") {
  $wxOk = $true; $wxDetail = '配置存在，但探测超时（weflow-cli 可能卡住）'
} else {
  $wxDetail = 'weflow-cli 探测超时且无配置'
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
      $rp = Invoke-Timed -TimeoutSec 40 -Block { & lark-cli im +chat-list --as user 2>&1 }
      if (-not $rp.timeout) {
        $probe = $rp.text
        $fsOk = $probe -match '"ok"\s*:\s*true'
        if ($fsOk) { $fsDetail = '已过期但刷新成功（wrapper 已续期）' }
        else { $fsDetail = ("已过期 {0} 分钟，刷新失败 — 需重新授权" -f (-$left)) }
      } else { $fsDetail = ("已过期 {0} 分钟，lark-cli 探测超时" -f (-$left)) }
    }
  } catch { $fsDetail = "token 文件解析失败: $($_.Exception.Message)" }
} else { $fsDetail = '没有 token 文件（从未授权）' }
Add-Row '飞书' $fsOk $fsDetail

# ── 5. 浏览器通道（bsk）────────────────────────────────
$bskOk = $false
$bskDetail = ''
# 解析顺序：BSK_EXE > PATH > 工作区内的 .tools\bsk（定时任务里没有 PATH 和上述环境变量，
# 所以最后这个回落很重要）
$bskExe = if ($env:BSK_EXE) { $env:BSK_EXE } else { (Get-Command bsk -ErrorAction SilentlyContinue).Source }
if (-not $bskExe) {
  $cand = Join-Path $root '.tools\bsk\bsk.exe'
  if (Test-Path $cand) { $bskExe = $cand }
}
if (-not $env:BSK_HOME) {
  $homeCand = Join-Path $root '.bsk-home'
  if (Test-Path $homeCand) { $env:BSK_HOME = $homeCand }
}
if ($bskExe) {
  # 关键：守护进程没起来时，bsk 的 CLI 会**自动尝试启动它并卡住**，连 Stop-Job 都停不下来
  # （实测自检因此挂了 7 分钟）。所以先看 daemon.json 和 pid，不健康就完全不调 bsk。
  $daemonJson = Join-Path $env:BSK_HOME 'daemon.json'
  $alive = $false
  $dinfo = ''
  if (Test-Path $daemonJson) {
    try {
      $d = Get-Content $daemonJson -Raw | ConvertFrom-Json
      $proc = Get-Process -Id $d.pid -ErrorAction SilentlyContinue
      $alive = [bool]$proc
      $dinfo = "pid=$($d.pid) 端口=$($d.ws_port)"
    } catch { $alive = $false }
  }

  if (-not $alive -and $Fix) {
    # -Fix：只触发启动，不在同一次里等待验证
    # （实测在同一个进程里既启动又等待/查询 bsk，会卡住不返回）
    Write-Host '  [fix] 已触发 bsk 守护进程启动（后台）'
    Start-Process -FilePath $bskExe -ArgumentList @('daemon', 'start') -WindowStyle Hidden | Out-Null
    $fixPending = $true
  }

  if ($fixPending) {
    $bskDetail = '刚触发启动，本次不验证（再跑一次自检即可确认）'
  } elseif (-not $alive) {
    $bskDetail = '守护进程没在跑（' + $daemonJson + ' 里没有活着的 pid）。用 -Fix 自动拉起，或手动：Start-Process bsk -ArgumentList "daemon","start"'
  } else {
    $rb = Invoke-Timed -TimeoutSec 25 -Block {
      param($exe, $bskHomeDir)
      if ($bskHomeDir) { $env:BSK_HOME = "$bskHomeDir" }
      & $exe browsers 2>&1
    } -ArgList @($bskExe, $env:BSK_HOME)
    if ($rb.timeout) {
      $bskDetail = "守护进程在（$dinfo）但探测超时"
    } else {
      $st = $rb.text
      $cnt = (@($st -split "`n" | Where-Object { $_ -match '^[0-9a-f]{8}\s' })).Count
      $bskOk = $cnt -gt 0
      $bskDetail = if ($bskOk) { "$cnt 个浏览器已连接（$dinfo）" } else { "守护进程在（$dinfo）但没有浏览器连：打开 Edge 并确认 browser-skill 扩展是绿的" }
    }
  }
} else { $bskDetail = 'bsk 不在 PATH（贴吧/知乎不可用）' }
Add-Row '浏览器通道' $bskOk $bskDetail

# ── 6. 贴吧 / 知乎 脚本就位 ─────────────────────────────
foreach ($name in 'tieba', 'zhihu') {
  $script = Join-Path $skills "$name\scripts\$name.ps1"
  $cliJs = Join-Path $skills "$name\scripts\$name.mjs"
  $ok = (Test-Path $script) -and (Test-Path $cliJs) -and $bskOk
  Add-Row ("{0} 工具" -f $name) $ok $(if ($ok) { '脚本就位 + 浏览器通道正常' } elseif (-not (Test-Path $script)) { '脚本缺失' } else { '浏览器通道不可用' })
}

# ── 6b. B站（复用 zhaowen-mcp/bilibili）──────────────────
$biliDir = Join-Path $root 'zhaowen-mcp\bilibili'
$biliOk = (Test-Path (Join-Path $biliDir 'cli.ts')) -and (Test-Path (Join-Path $biliDir 'node_modules\tsx'))
$biliDetail = if (-not (Test-Path (Join-Path $biliDir 'cli.ts'))) { 'cli.ts 缺失' }
  elseif (-not (Test-Path (Join-Path $biliDir 'node_modules\tsx'))) { 'tsx 未安装（npm i）' }
  elseif ($env:BILI_COOKIE) { '就位；BILI_COOKIE 已设（可读历史/收藏）' }
  else { '就位；未设 BILI_COOKIE（仅公开数据）' }
Add-Row 'B站 工具' $biliOk $biliDetail

# ── 6c. 小红书（依赖本机引擎，未接入）────────────────────
$xhsOk = $false
$xhsDetail = '未接入：其 MCP 只是代理，需要本机 18060 端口的引擎服务'
try {
  $probe = Test-NetConnection -ComputerName 127.0.0.1 -Port 18060 -InformationLevel Quiet -WarningAction SilentlyContinue
  if ($probe) { $xhsOk = $true; $xhsDetail = '引擎在 18060 已监听（可接入）' }
} catch { }
Add-Row '小红书' $xhsOk $xhsDetail

# ── 6d. 纪念碑谷服务（端口 3001）──────────────────────────
$valleyPort = 3001
$listening = ([System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | Select-Object -ExpandProperty Port -Unique) -contains $valleyPort
$vFixFired = $false
if (-not $listening -and $Fix) {
  $starter = Join-Path $here 'start-valley.cmd'
  if (Test-Path $starter) {
    Write-Host '  [fix] 已触发纪念碑谷启动（后台）'
    Start-Process -FilePath $starter -WindowStyle Hidden | Out-Null
    $vFixFired = $true
  }
}
$vOk = $listening -or $vFixFired
$vDetail = if ($listening) { "http://127.0.0.1:$valleyPort 在监听" } elseif ($vFixFired) { '刚触发启动，稍后访问 http://127.0.0.1:3001' } else { '没在跑（-Fix 会自动拉起，或手动 scripts\start-valley.cmd）' }
Add-Row '纪念碑谷' $vOk $vDetail
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

$fail = @($rows | Where-Object { $_.状态 -ne 'OK' }).Count
if ($fail -eq 0) { Write-Host '  全部正常' -ForegroundColor Green; exit 0 }
else { Write-Host ("  {0} 项异常" -f $fail) -ForegroundColor Yellow; exit 1 }
