# Rotina — Aplicativo de Produtividade Pessoal Offline

Rotina é um SPA (Single Page Application) focado em dispositivos móveis (mobile-first para celular e tablet), desenhado para funcionar **100% offline**, armazenando dados e imagens localmente através de **IndexedDB** e preferências no **localStorage**.

---

## 📱 Como instalar no Celular (PWA)

O aplicativo foi projetado para uso como Web App Progressivo (PWA) nativo com safe areas e alvos de toque otimizados (≥44px):

### No iPhone (iOS / Safari)
1. Abra o link da aplicação no navegador **Safari**.
2. Toque no botão de **Compartilhar** (ícone de quadrado com seta para cima no centro inferior).
3. Role para baixo e selecione **Adicionar à Tela de Início** (Add to Home Screen).
4. Confirme o nome "Rotina" e toque em **Adicionar**.
5. O ícone aparecerá na tela do seu celular e abrirá sem barra de endereço, em tela cheia e funcionando totalmente offline.

### No Android (Google Chrome)
1. Abra o link da aplicação no navegador **Chrome**.
2. Toque no menu de três pontos no canto superior direito.
3. Toque em **Adicionar à tela inicial** (ou **Instalar aplicativo**).
4. Confirme a instalação. O aplicativo será instalado como app independente.

---

## 👥 Como compartilhar com Testers
1. Abra o app e acesse a aba **Mais**.
2. Na seção **Backup e Armazenamento**, toque no botão **Compartilhar com testers**. O link completo da aplicação será copiado diretamente para a área de transferência do seu dispositivo.
3. Cole o link no WhatsApp, Telegram ou e-mail para a equipe de testes.
4. Os testers podem carregar dados de demonstração tocando em **"Carregar dados de exemplo"** na tela Mais ou no banner inicial de boas-vindas da tela **Hoje**.

---

## 🏗️ Arquitetura e Módulos

- **Camada de Repositório Isolada (`src/lib/repositories/`)**:
  - `hojeRepository`: agrega indicadores diários, leitura e treinos.
  - `escritaRepository`: diário pessoal, busca instantânea, tags e auto-save.
  - `leituraRepository`: biblioteca, metas diária (20 pág), semanal (100 pág), mensal (430 pág), streak e histórico.
  - `treinoRepository`: planejamento semanal Seg–Dom, logs de séries e evolução por exercício.
  - `settingsRepository` & `backupRepository`: controle de temas, módulos ativos, exportação/importação JSON com rollback.
- **Armazenamento de Imagens**: Fotos de capas de livros são comprimidas no navegador (máx. 800px, JPEG qualidade 0.7) e armazenadas como Data URLs no IndexedDB.
- **Responsividade**: Em telas maiores ou tablets (≥768px), as telas de Leitura e Treino dividem-se dinamicamente em 2 colunas (lista à esquerda e conteúdo/detalhes à direita), enquanto na Escrita é exibido um painel lateral de calendário.
