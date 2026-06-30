@echo off
cd /d "%USERPROFILE%\Documents\GitHub\acervo-colecionavel"
echo.
echo ========================================
echo   Copiando arquivo novo do Downloads...
echo ========================================

if exist "%USERPROFILE%\Downloads\index.js" (
    copy /Y "%USERPROFILE%\Downloads\index.js" "pages\index.js"
    del "%USERPROFILE%\Downloads\index.js"
)
if exist "%USERPROFILE%\Downloads\supabase.js" (
    copy /Y "%USERPROFILE%\Downloads\supabase.js" "lib\supabase.js"
    del "%USERPROFILE%\Downloads\supabase.js"
)
if exist "%USERPROFILE%\Downloads\search-price.js" (
    copy /Y "%USERPROFILE%\Downloads\search-price.js" "pages\api\search-price.js"
    del "%USERPROFILE%\Downloads\search-price.js"
)
if exist "%USERPROFILE%\Downloads\search-price-detail.js" (
    copy /Y "%USERPROFILE%\Downloads\search-price-detail.js" "pages\api\search-price-detail.js"
    del "%USERPROFILE%\Downloads\search-price-detail.js"
)

echo.
echo ========================================
echo   Enviando para o GitHub...
echo ========================================
git pull
git add .
git commit -m "atualizacao"
git push

echo.
echo ========================================
echo   PRONTO! Site atualizando em 1 minuto.
echo ========================================
pause
