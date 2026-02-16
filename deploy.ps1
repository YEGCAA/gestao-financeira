# Script de Deploy para GitHub Pages
Write-Host "🚀 Iniciando deploy para GitHub Pages..." -ForegroundColor Cyan

# 1. Build da aplicação
Write-Host "`n📦 Fazendo build da aplicação..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green

# 2. Navegar para o diretório dist
Set-Location dist

# 3. Inicializar repositório Git no dist
Write-Host "`n📝 Preparando arquivos para deploy..." -ForegroundColor Yellow
git init
git add -A
git commit -m "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# 4. Fazer push para gh-pages
Write-Host "`n🌐 Fazendo deploy para GitHub Pages..." -ForegroundColor Yellow
$remoteUrl = git config --get remote.origin.url
git push -f $remoteUrl main:gh-pages

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host "🌍 Sua aplicação estará disponível em: https://yegcaa.github.io/gestao-financeira/" -ForegroundColor Cyan
}
else {
    Write-Host "`n❌ Erro no deploy!" -ForegroundColor Red
}

# 5. Voltar para o diretório raiz
Set-Location ..

# 6. Limpar
Remove-Item -Recurse -Force dist\.git -ErrorAction SilentlyContinue
