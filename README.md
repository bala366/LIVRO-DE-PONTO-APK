# Livro de Ponto Digital - Android APK

Projeto Android adaptado do Livro de Ponto Digital desktop. Mantém Dashboard, Ponto, Funcionários, Registros, Relatórios, Horas Extras, Banco de Horas, Configurações e Backup.

## Subir no GitHub
1. Crie um repositório vazio.
2. Envie TODO o conteúdo desta pasta para a raiz do repositório.
3. Abra a aba **Actions**.
4. Execute **Gerar APK - Livro de Ponto Digital** (ou faça um push na branch main).
5. Ao terminar, abra a execução e baixe o artefato **Livro-Ponto-Digital-APK**.

## Build usado
- Ubuntu latest
- Temurin Java 17
- Gradle 8.9
- `gradle clean :app:assembleDebug --stacktrace`
- APK: `app/build/outputs/apk/debug/*.apk`

## Dados
Os registros ficam no armazenamento local do WebView do aparelho. Use Backup para salvar JSON em Downloads e Restaurar backup para recuperar a base.
