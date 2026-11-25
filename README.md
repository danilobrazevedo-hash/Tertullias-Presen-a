# Tertúlias · Presença

App de celular (Android e iPhone) para registrar presença nas tertúlias de quinta-feira.
Cada pessoa cadastra **nome e sobrenome** uma vez e, a partir das **20h15** do dia, marca
**Estive presente**, **Faltei** ou **Falta justificada** (com o motivo).
As respostas ficam numa **Planilha Google** que a organização acompanha.

## Como colocar no ar (uma vez só)

### 1. Planilha Google (onde ficam as respostas)
1. Crie uma planilha nova em <https://sheets.new> com o nome **Tertúlias · Presença**.
2. Menu **Extensões → Apps Script**.
3. Apague o conteúdo de `Código.gs` e cole o conteúdo de [`apps-script/Code.gs`](apps-script/Code.gs). Salve.
4. Em cima, escolha a função **configurar** e clique em **Executar**. Autorize com sua conta Google.
   Isso cria as abas **Tertulias**, **Respostas** e **Pessoas** e preenche todas as quintas de 26/11/2026 a 30/12/2027.
5. Clique em **Implantar → Nova implantação → tipo: App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
6. Copie o endereço que termina em **/exec**.

### 2. Ligar o app à planilha
Abra o arquivo [`config.js`](config.js) e cole o endereço entre as aspas:
```js
window.TERTULIAS_API = "https://script.google.com/macros/s/XXXX/exec";
```

### 3. Publicar no GitHub Pages
1. No repositório do GitHub: **Settings → Pages**.
2. Em *Build and deployment*, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)**. Salve.
3. Em 1–2 minutos o app fica em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
   Esse é o link para mandar às pessoas.

## Como cada pessoa instala no celular
- **Android (Chrome):** abrir o link → **⋮ (3 pontinhos)** → **Instalar app** (ou *Adicionar à tela inicial*).
- **iPhone (Safari):** abrir o link → botão **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início**.

O ícone azul com o logo aparece na tela inicial e o app abre em tela cheia, como um aplicativo.

## Dia a dia da organização (tudo pela planilha)
| O que fazer | Onde |
|---|---|
| Definir o tema e quem conduz | Aba **Tertulias**, colunas *Tema* e *Quem conduz* |
| Exigir palavra-chave para "Estive presente" | Coluna *Palavra-chave* (deixe vazio para não exigir) |
| Abrir as respostas antes das 20h15 (teste) | Marque a caixa *Liberada* |
| Ver quem respondeu | Aba **Respostas** (use Dados → Criar filtro) |
| Ver as pessoas cadastradas | Aba **Pessoas** |

Regras: as respostas abrem às **20h15** da quinta (a tertúlia vai das 20h30 às 21h30) e
ficam abertas por **7 dias**. Cada pessoa tem uma resposta por tertúlia; se mudar, vale a última.

> Mudou o código em `Code.gs`? Faça **Implantar → Gerenciar implantações → editar → Nova versão**
> para o endereço /exec continuar o mesmo.

## Arquivos
- `index.html` – o app
- `config.js` – endereço da planilha
- `manifest.webmanifest`, `sw.js`, `icons/` – o que faz o app ser instalável
- `apps-script/` – código que vai dentro da planilha
