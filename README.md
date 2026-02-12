<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1jlabjIHj_-OXB4YuXdY7IigVrd26YlNJ

## Configuração
1. Instale as dependências: `npm install`
2. Crie um arquivo `.env.local` baseado no `.env.example` e preencha suas chaves do Supabase e Gemini.
3. Execute o app: `npm run dev`

## Deploy
Este projeto está pronto para ser enviado ao GitHub. Os arquivos sensíveis (como `.env` e scripts de teste) já estão no `.gitignore`.

Para subir ao GitHub:
1. Crie um repositório no GitHub.
2. Rode:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   git branch -M main
   git push -u origin main
   ```
