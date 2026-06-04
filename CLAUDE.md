# CBR+PNK — Foundry VTT System

Sistema não-oficial para o RPG **CBR+PNK** rodando no Foundry Virtual Tabletop.

- **Repositório**: https://github.com/Hebert-C/CBR-PNK-FOUNDRY
- **Servidor de teste**: neteria.dicefables.com
- **Foundry alvo**: V12 build 331 (compatível com V12–V13)
- **Versão atual**: ver `system.json` → campo `version`

> **Regra obrigatória**: a cada push para `main`, incrementar `"version"` no `system.json`.
> O Foundry usa esse campo para exibir notificação de atualização via manifest.

---

## Arquitetura

```
main.js              — Entry point: registro de sheets, Handlebars helpers
module/
  sheets/
    runner.js        — Sheet do Actor tipo "runner" (personagem jogável)
    hunter.js        — Sheet do Actor tipo "hunter" (adversário/NPC)
    item.js          — Sheet de Items (augmentation, item)
  system.js          — Registro de configurações do sistema
templates/
  sheets/
    runner.hbs       — Template da ficha do runner
    hunter.hbs       — Template da ficha do hunter
    parts/
      augmentation.hbs — Partial reutilizável para augmentações
    items/
      augmentation.hbs — Sheet do item tipo augmentation
      item.hbs         — Sheet do item genérico
  roll-card.hbs      — Mensagem de chat para resultados de rolls
template.json        — Schema de dados para Actors e Items
system.json          — Manifesto do sistema
main.css             — Estilos globais
```

---

## API Foundry V12 — Padrões Usados

### Sheet Classes

Todas as sheets usam a API V2:
```javascript
class cbrRunner extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.DocumentSheetV2
) { ... }
```

**Requisitos obrigatórios da V12:**
- `static PARTS = { form: { template: "systems/CBRPNK/..." } }` — cada part precisa de **exatamente um** elemento HTML raiz no template (sem múltiplos elementos raiz como `<link>` + `<form>`)
- `static DEFAULT_OPTIONS` com `position` e `form: { submitOnChange: true, closeOnSubmit: false }`
- `async _prepareContext(options)` — sempre `await super._prepareContext(options)` primeiro
- `_onRender(context, options)` — para anexar event listeners (não `activateListeners`)

### Registro de Sheets

```javascript
// V12: usar globais Items e Actors (sem unregisterSheet — não é necessário)
Items.registerSheet("cbr", cbrItem, { makeDefault: true });
Actors.registerSheet("cbr", cbrRunner, { types: ["runner"], makeDefault: true });
Actors.registerSheet("cbr", cbrHunter, { types: ["hunter"], makeDefault: true });
```

**Não usar:**
- `foundry.documents.collections.*` — não existe no V12
- `foundry.documents.Actor/Item` — não tem `registerSheet`
- `foundry.appv1.*` — não existe em todos os builds do V12
- `unregisterSheet(...)` — desnecessário; `makeDefault: true` é suficiente

### TextEditor.enrichHTML

Sempre async em V12. Fazer em `_prepareContext`, nunca no template:
```javascript
context.enrichedDetails = await TextEditor.enrichHTML(
    this.actor.system.angle.DETAILS ?? "",
    {
        relativeTo: this.actor,
        secrets: this.actor.isOwner,
        rollData: this.actor.getRollData?.()
    }
);
```

E no template usar a variável enriquecida:
```hbs
{{editor enrichedDetails target="system.angle.DETAILS" button=true editable=editable}}
```

**Não usar** `owner=owner` no helper `{{editor}}` — parâmetro removido na V12.

### ChatMessage.create

```javascript
ChatMessage.create({
    rolls: [letsRoll],           // array, não "roll" singular
    author: game.user.id,        // "author" não "user" (renomeado na V12.316)
    speaker: ChatMessage.getSpeaker({ token: this.actor }),
    content: content
});
```

**Não usar:**
- `user:` — renomeado para `author:` na V12.316
- `type: CONST.CHAT_MESSAGE_TYPES.ROLL` — constante removida na V13
- `Roll.roll({ async: true })` — parâmetro removido; rolls são sempre async na V12

### Roll

```javascript
// V12: sem parâmetro {async: true}
const roll = await new Roll("2d6").roll();
const results = roll.terms[0].results.map(({ result }) => result);
```

### Template dinâmico por tipo de item

Para evitar mutação de propriedade estática compartilhada (`static PARTS`), usar override de `_renderHTML`:
```javascript
async _renderHTML(context, options) {
    const template = `systems/CBRPNK/templates/sheets/items/${this.item.type}.hbs`;
    return { form: await renderTemplate(template, context) };
}
```

### Carregamento de templates parciais

```javascript
// Usar global loadTemplates — foundry.applications.handlebars não existe nessa build
loadTemplates([
    "systems/CBRPNK/templates/sheets/parts/augmentation.hbs"
]);
```

### Caminhos de assets no CSS

Usar sempre `/systems/CBRPNK/assets/...` (caminho absoluto correto no servidor Foundry):
```css
src: url('/systems/CBRPNK/assets/material-symbols/MaterialSymbolsOutlined.woff2');
```
**Não usar** `/CBRPNK/assets/...` — o Foundry serve sistemas em `/systems/<id>/`.

---

## template.json — Schema

- `view: "block"` deve estar **dentro** do tipo `runner`, não no nível raiz de `Actor`
- Propriedades raiz de `Actor` fora dos tipos podem ser ignoradas pela V12
- Tipos: `runner`, `hunter` para Actors; `item`, `augmentation` para Items

---

## Bugs Corrigidos Historicamente

| Versão | Bug | Causa | Fix |
|--------|-----|-------|-----|
| 1.06 | Sheet em branco, erro silencioso | `context.system.wierd = ...` mutava o DataModel | Mover para `context.wierd` |
| 1.06 | HTML malformado | `</div>` extra em `section.roll`, sem `</section>` | Corrigir estrutura |
| 1.07 | `foundry.documents.collections` undefined | Namespace inexistente | Trocar por `Items`/`Actors` globais |
| 1.08 | `foundry.documents.Item` undefined | Namespace inexistente | Idem |
| 1.09 | `foundry.appv1` undefined | Namespace inexistente nessa build | Remover `unregisterSheet` |
| 1.11 | "Template part must render a single HTML element" | `<link>` + `<form>` como dois elementos raiz no `runner.hbs` | Remover `<link>` redundante (fonte já está no CSS) |
| 1.12 | `{{editor}}` sem enriquecimento; `user` → `author` | API V12 exige pré-enriquecimento; `ChatMessage#user` renomeado | `TextEditor.enrichHTML` + `author:` |
| 1.13 | `foundry.applications.handlebars` undefined | Namespace inexistente nessa build | Usar global `loadTemplates` |
| 1.13 | Fonte Material Symbols 404 | Caminho `/CBRPNK/assets/` errado | Corrigir para `/systems/CBRPNK/assets/` |

---

## Configurações do Sistema

Registradas em `module/system.js`:

| Chave | Tipo | Descrição |
|-------|------|-----------|
| `wiedModule` | Boolean | Habilita skill ATTUNE e módulo "weird" |
| `resetDice` | Boolean | Auto-reset de dados adicionais após roll |
| `AugGlitchedCheck` | Boolean | Conta augmentações glitchadas apenas se ativas |

---

## Workflow de Desenvolvimento

1. Editar arquivos locais em `c:\Users\Hebert-PC\Desktop\Portifolio\CBR+PNK`
2. Bumpar `"version"` no `system.json` (ex: `1.11` → `1.12`)
3. Commitar e dar push para `main`:
   ```
   git add <arquivos> system.json
   git commit -m "fix/feat: descrição"
   git push origin main
   ```
4. No Foundry, atualizar o sistema pelo manifest:
   `https://raw.githubusercontent.com/Hebert-C/CBR-PNK-FOUNDRY/main/system.json`
