import cbrItem from "./module/sheets/item.js";
import cbrRunner from "./module/sheets/runner.js";
import cbrHunter from "./module/sheets/hunter.js";
import { CbrSettings } from "./module/system.js";

async function preloadHandlebarTemplates() {
    const templatepaths = [
      "systems/CBRPNK/templates/sheets/parts/augmentation.hbs",
    ];
    return loadTemplates(templatepaths);
  }

Hooks.once("i18nInit", async function () {
    const translations = await fetch("systems/CBRPNK/lang/pt-br.json").then(r => r.json());
    foundry.utils.mergeObject(game.i18n.translations, translations);
});

Hooks.once("init", async function () {
    console.log('Start');

    Items.registerSheet("cbr", cbrItem, {makeDefault: true});
    Actors.registerSheet("cbr", cbrRunner, {types: ["runner"], makeDefault: true});
    Actors.registerSheet("cbr", cbrHunter, {types: ["hunter"], makeDefault: true});

    CbrSettings.register();

    await preloadHandlebarTemplates();

    console.log("Successfully initialized CBR+PNK!");
});

// Custom HandelBars
Handlebars.registerHelper("for", function(options, elem) {
    let result = ``;
    for (let i = 1 ; i <= options ; i++)
        result += elem.fn(this).replace('#{i}', i);
    return result;
});

Handlebars.registerHelper('isBigger', function (max, value) {
    return value <= max;
});

Handlebars.registerHelper('isEqual', function (max, value) {
    return value == max;
});

Handlebars.registerHelper('drawDice', function (dices) {
    return [1,2].map( box => box <= dices ? `<i class="fa-solid fa-square-plus"></i>` : `<i class="fa-regular fa-square-plus"></i>` ).toLocaleString().replace(',','')
}) 

Handlebars.registerHelper( 'loopTrack', function (min, max, current, track) {
    let result = ``;
    for ( let i = min ; i <= max ; i++ ) {
        result += `<label><input name="${track}" type="radio" value=${i} ${i == current ? 'checked' : ''}/>${i}</label>`
    }
    return result
})