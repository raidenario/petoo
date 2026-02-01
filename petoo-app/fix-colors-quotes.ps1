# Script para remover aspas dos COLORS em todos os arquivos
$files = Get-ChildItem -Path "src" -Filter "*.js" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    # Remover aspas simples dos COLORS
    if ($content -match "'COLORS\.") {
        $content = $content -replace "'COLORS\.PRIMARY_DARK'", "COLORS.PRIMARY_DARK"
        $content = $content -replace "'COLORS\.PRIMARY_LIGHT'", "COLORS.PRIMARY_LIGHT"
        $content = $content -replace "'COLORS\.PRIMARY'", "COLORS.PRIMARY"
        $content = $content -replace "'COLORS\.TEXT_MUTED'", "COLORS.TEXT_MUTED"
        $content = $content -replace "'COLORS\.BG_LIGHT'", "COLORS.BG_LIGHT"
        $content = $content -replace "'COLORS\.BG_LIGHTER'", "COLORS.BG_LIGHTER"
        $modified = $true
    }
    
    # Remover aspas duplas dos COLORS  
    if ($content -match '"COLORS\.') {
        $content = $content -replace '"COLORS\.PRIMARY_DARK"', "COLORS.PRIMARY_DARK"
        $content = $content -replace '"COLORS\.PRIMARY_LIGHT"', "COLORS.PRIMARY_LIGHT"
        $content = $content -replace '"COLORS\.PRIMARY"', "COLORS.PRIMARY"
        $content = $content -replace '"COLORS\.TEXT_MUTED"', "COLORS.TEXT_MUTED"
        $content = $content -replace '"COLORS\.BG_LIGHT"', "COLORS.BG_LIGHT"
        $content = $content -replace '"COLORS\.BG_LIGHTER"', "COLORS.BG_LIGHTER"
        $modified = $true
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Fixed: $($file.Name)"
    }
}

Write-Host "`nAll files processed!"
