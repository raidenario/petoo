# Script para atualizar cores em todos os arquivos do projeto
$files = Get-ChildItem -Path "src" -Filter "*.js" -Recurse

$replacements = @{
    "#6C5CE7" = "COLORS.PRIMARY"
    "#5849C4" = "COLORS.PRIMARY_DARK"
    "#A29BFE" = "COLORS.PRIMARY_LIGHT"
    "#B2A9FF" = "COLORS.TEXT_MUTED"
    "#E8E4FF" = "#E8DEFF"
    "#F8F7FF" = "COLORS.BG_LIGHTER"
    "#F3F0FF" = "COLORS.BG_LIGHT"
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    foreach ($old in $replacements.Keys) {
        if ($content -match [regex]::Escape($old)) {
            $content = $content -replace [regex]::Escape($old), $replacements[$old]
            $modified = $true
        }
    }
    
    if ($modified) {
        # Adicionar import se não existir
        if ($content -notmatch "import.*COLORS.*from.*constants/colors") {
            $content = $content -replace "(import.*from 'react-native';)", "`$1`nimport { COLORS } from '../../constants/colors';"
        }
        
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.Name)"
    }
}

Write-Host "Color update complete!"
