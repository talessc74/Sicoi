# Manual de Implantação Universitária do SIGCOI
**Guia Prático para Docentes, Curadores e Laboratórios de Bioantropologia**  
*Projeto de Pós-Doutorado da Dra. Nicole Damascena (Perita Criminal Federal - INC/DITEC/PF)*

---

## 1. Visão Geral

O **SIGCOI (Sistema de Gestão de Coleções Osteológicas Identificadas)** é uma plataforma acadêmica e pericial de código aberto destinada ao controle, catalogação anatômica, inventário bioantropológico e rastreabilidade com hashes criptográficos (SHA-256) de remanescentes ósseos humanos.

Para atender aos preceitos éticos da bioantropologia e da LGPD, o SIGCOI opera sob o **Modelo de Federação de Instâncias Autônomas**:
- **Sua Universidade tem soberania total**: o banco de dados é da sua instituição. Nenhum dado sensível de laudos ou ossadas transita por servidores externos.
- **Custo Zero**: o sistema pode ser executado gratuitamente em provedores de nuvem acadêmicos ou no servidor local da faculdade.
- **Sem Dependência de TI Complexa**: o deploy inicial pode ser feito em menos de 5 minutos por qualquer pesquisador.

---

## 2. Opção A: Implantação em Nuvem em 1-Clique (Recomendada — 5 Minutos)

Esta opção não requer instalação de programas no seu computador. Tudo roda em serviços de nuvem de alta disponibilidade com planos gratuitos.

```mermaid
flowchart LR
    A["1. Criar Banco no Neon\n(PostgreSQL Gratuito)"] --> B["2. Clicar em Deploy to Render\n(Painel Render)"]
    B --> C["3. Definir Sigla da Faculdade\n(ex: UFMG / USP)"]
    C --> D["4. Primeiro Acesso\n(Cadastrar Admin)"]
```

### Passo 1: Criar o Banco de Dados PostgreSQL Gratuito (Neon)
1. Acesse [console.neon.tech](https://console.neon.tech) e crie uma conta gratuita (login via GitHub ou Google).
2. Crie um projeto com o nome da sua coleção (ex.: `osteologia-ufmg`).
3. Na tela principal (*Dashboard*), copie a connection string exibida (certifique-se de marcar a opção **Pooled Connection**). Ela se parece com:
   ```text
   postgresql://usuario:senha@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Guarde esse texto; você irá colá-lo no próximo passo.

### Passo 2: Disparar o Deploy Automático no Render
1. Acesse o repositório público do SIGCOI e clique no botão:
   
   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/talessc74/Sicoi)

2. Faça login ou crie sua conta gratuita no [Render.com](https://render.com).
3. O Render identificará o blueprint do SIGCOI (`render.yaml`).
4. Preencha as variáveis de ambiente solicitadas:
   - `DATABASE_URL`: Cole a connection string copiada no Passo 1.
   - `SESSION_SECRET`: Digite uma sequência longa aleatória de letras e números para proteger as senhas de login (ex: `chave-secreta-laboratorio-2026-xyz`).
   - `VITE_INSTITUTION_NAME`: Nome por extenso da sua universidade (ex.: `Universidade Federal de Minas Gerais`).
   - `VITE_INSTITUTION_ACRONYM`: Sigla que aparecerá no sistema (ex.: `UFMG` ou `LAF-UFMG`).
   - `VITE_COLLECTION_PREFIX`: Prefixo das caixas (ex.: `COI-UFMG`).
   - `VITE_CURATOR_CONTACT_EMAIL`: E-mail do curador responsável para contato.
5. Clique em **Apply** / **Create Web Service**.
6. Em cerca de 3 a 4 minutos, o Render finalizará a compilação e exibirá sua URL pública exclusiva (ex.: `https://osteologia-ufmg.onrender.com`).

---

## 3. Primeiro Acesso: Cadastro do Administrador

Ao acessar a sua URL do SIGCOI pela primeira vez com o banco de dados vazio:
1. O sistema exibirá automaticamente a tela **"Criar Primeiro Administrador"**.
2. Preencha o nome do Docente / Curador Geral, e-mail institucional e uma senha segura.
3. Clique em **"Concluir Instalação e Entrar"**.
4. Pronto! O sistema cria as tabelas criptográficas, o grafo de conhecimento e carrega o painel principal configurado com a identidade da sua universidade.

---

## 4. Cadastrando a Equipe do Laboratório

Dentro do SIGCOI, o Curador/Administrador pode cadastrar toda a sua equipe com base na matriz de perfis de acesso:
- **Curador**: Acesso irrestrito a todas as 7 fases, aprovação de laudos, inventário bioantropológico e assinatura curatorial.
- **Técnico de Laboratório**: Condução passo a passo de recebimento, lavagem, acondicionamento e marcação física óssea.
- **Pesquisador Externo**: Acesso à Fase 7 (Consulta e Exportação Científica) mediante autorização cadastrada com termo do Comitê de Ética em Pesquisa (CEP).
- **Estudante (Supervisionado)**: Preenchimento de fichas e inventários com revisão obrigatória do curador.

Para cadastrar:
1. Acesse o menu **Configurações** (engrenagem no topo).
2. Na seção **Pessoas Cadastradas**, clique em **"+ Nova Pessoa"**.
3. Defina o nome, e-mail e papel. O sistema gera um link de uso único para que o usuário defina sua própria senha.

---

## 5. Opção B: Servidor Local On-Premise (Docker Compose)

Caso seu laboratório possua restrição de internet ou prefira rodar o sistema em um computador dedicado na bancada:

### Requisitos:
- Docker e Docker Compose instalados no computador do laboratório.

### Passo a passo:
1. Clone o repositório ou baixe o arquivo zip:
   ```bash
   git clone https://github.com/talessc74/Sicoi.git
   cd Sicoi
   ```
2. Crie seu arquivo de configuração a partir do modelo:
   ```bash
   cp .env.example .env
   ```
3. Edite o arquivo `.env` informando a sigla da faculdade e a chave de sessão.
4. Inicie o sistema e o banco de dados local com um único comando:
   ```bash
   docker compose up -d
   ```
5. Abra o navegador em `http://localhost:3000`.

---

## 6. Como Atualizar sua Instância em 1-Clique (Zero Conflitos)

Quando a equipe da Dra. Nicole publicar melhorias, novas técnicas de estimativa biológica ou novos módulos:
1. Acesse a página do seu fork no GitHub.
2. Clique no botão oficial **"Sync Fork"** e depois em **"Update Branch"**.
3. O Render ou seu container Docker detectará a atualização e recompilará o sistema sozinho.
4. **Seus dados estão 100% seguros**: as atualizações do SIGCOI são estritamente aditivas e idempotentes. Nenhum esqueleto cadastrado, laudo ou foto é alterado durante o processo.

---

## 7. Como Citar o SIGCOI nas Publicações da sua Faculdade

Todo trabalho científico, TCC, dissertação de mestrado ou tese de doutorado que utilize o acervo catalogado pelo SIGCOI deve conter a devida citação da metodologia:

> **ABNT (NBR 6023)**:  
> DAMASCENA, Nicole Prata; CARVALHO, Tales Seixas de; BENTO, Maria Izabel Cardoso; MACHADO, Carlos Eduardo Palhares. **SIGCOI: An Open-Source, Blockchain-Ready Management System for Human Osteological Collections and Forensic Bioanthropology**. Forensic Science International / Repositório Institucional, 2026. Disponível em: `<https://github.com/talessc74/Sicoi>`.

O sistema também possui um botão **"Como Citar este Software"** no rodapé e na tela de exportação de dados para cópia imediata em BibTeX e ABNT.

---

## 8. Dúvidas e Suporte Acadêmico

- **Repositório Oficial da Comunidade**: <https://github.com/talessc74/Sicoi>
- **Coordenação do Projeto**: Dra. Nicole Prata Damascena (Perita Criminal Federal - INC/DITEC/PF)
- **Engenharia e Arquitetura**: Tales Seixas de Carvalho
