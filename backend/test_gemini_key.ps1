$key = "AQ.Ab8RN6I_whjd8X5gsJxWi_U64wmQrgfmxE32iSb5r3xLAgvYtw"
$body = '{"contents":[{"role":"user","parts":[{"text":"Say OK"}]}]}'

foreach ($model in @("gemini-3.1-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash")) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=$key"
    Write-Host "`n--- Testing $model ---"
    try {
        $response = Invoke-WebRequest -Uri $url -Method POST -ContentType "application/json" -Body $body -TimeoutSec 15
        Write-Host "SUCCESS - HTTP $($response.StatusCode)"
        Write-Host $response.Content.Substring(0, [Math]::Min(300, $response.Content.Length))
    } catch {
        $errResp = $_.Exception.Response
        if ($errResp) {
            $stream = $errResp.GetResponseStream()
            $reader = [System.IO.StreamReader]::new($stream)
            $errBody = $reader.ReadToEnd()
            Write-Host "FAILED - HTTP $($errResp.StatusCode.value__)"
            Write-Host $errBody.Substring(0, [Math]::Min(300, $errBody.Length))
        } else {
            Write-Host "NETWORK ERROR: $($_.Exception.Message)"
        }
    }
}
