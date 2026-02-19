# Deploy script for GitHub Pages
Write-Host "Iniciando deploy..." -ForegroundColor Cyan

$remoteUrl = git config --get remote.origin.url
Write-Host "Remote: $remoteUrl"

npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

if (Test-Path dist) {
    Set-Location dist
}
else {
    exit 1
}

git init
git config user.email "deploy@automated.com"
git config user.name "Deploy Bot"
git checkout -b main
git add -A
git commit -m "Deploy automated"
git push -f $remoteUrl main:gh-pages

if ($LASTEXITCODE -eq 0) {
    Write-Host "Sucesso!" -ForegroundColor Green
}
else {
    Write-Host "Erro!" -ForegroundColor Red
}

Set-Location ..
Remove-Item -Recurse -Force dist\.git -ErrorAction SilentlyContinue
