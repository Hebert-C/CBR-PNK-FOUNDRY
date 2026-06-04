export default class cbrRunner extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.DocumentSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["sheet", "actor", "runner"],
        position: { width: 440, height: 790 },
        form: { submitOnChange: true, closeOnSubmit: false }
    };

    static PARTS = {
        form: { template: "systems/CBRPNK/templates/sheets/runner.hbs" }
    };

    get actor() { return this.document; }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.actor = this.actor;
        context.system = this.actor.system;
        context.editable = this.isEditable;
        context.owner = this.actor.isOwner;
        context.wierd = game.settings.get("CBRPNK", "wiedModule");
        context.AugGlitchedCheck = game.settings.get("CBRPNK", "AugGlitchedCheck");
        context.augs = this.actor.items.filter(({type}) => type === "augmentation");
        context.view = this.actor.system.view || "block";
        context.enrichedDetails = await TextEditor.enrichHTML(
            this.actor.system.angle.DETAILS ?? "",
            { relativeTo: this.actor, secrets: this.actor.isOwner, rollData: this.actor.getRollData?.() }
        );
        return context;
    }

    _onResize(event) {
        if (this.element.offsetWidth > 600)
            this.actor.update({ "system.view": "grid" });
        else
            this.actor.update({ "system.view": "block" });
    }

    _onRender(context, options) {
        super._onRender(context, options);

        // Corrige scroll no V12: window-content precisa de overflow-y explícito
        const windowContent = this.element.querySelector(".window-content");
        if (windowContent) {
            windowContent.style.overflowY = "auto";
            windowContent.style.overflowX = "hidden";
            const part = windowContent.querySelector("[data-application-part]");
            if (part) part.style.overflow = "visible";
        }

        const form = this.element.querySelector("form");
        if (!form) return;

        form.addEventListener("mousedown", this._RunnerOnMouseDown.bind(this));
        form.querySelectorAll(".throw").forEach(el => el.addEventListener("mousedown", this.rolls.bind(this)));
        form.querySelectorAll(".roll").forEach(el => el.addEventListener("mousedown", this.setRolls.bind(this)));
        form.querySelectorAll("button.item-delete").forEach(el => el.addEventListener("mousedown", this._DeleteItem.bind(this)));
        form.querySelectorAll(".item-add").forEach(el => el.addEventListener("mousedown", this._AddItem.bind(this)));
        form.querySelectorAll(".item-name").forEach(el => el.addEventListener("change", this._itemName.bind(this)));
        form.querySelectorAll(".item-glitch").forEach(el => el.addEventListener("mousedown", this._ToggleGlitch.bind(this)));
        form.querySelectorAll(".item-isOpen").forEach(el => el.addEventListener("mousedown", this._itemOpen.bind(this)));
        form.querySelectorAll(".item-active").forEach(el => el.addEventListener("mousedown", this._itemActive.bind(this)));
        form.querySelectorAll(".item-edit").forEach(el => el.addEventListener("mousedown", this._itemEdit.bind(this)));
        form.querySelectorAll(".dots").forEach(el => el.addEventListener("mousedown", this._setSkill.bind(this)));
        form.querySelectorAll("h3:is([data-app],[data-skill])").forEach(el => el.addEventListener("mousedown", this._SelectAppSkill.bind(this)));
        form.querySelectorAll("[data-exp]").forEach(el => el.addEventListener("mousedown", this._SelectEpx.bind(this)));
        form.querySelectorAll(".flaw").forEach(el => el.addEventListener("mousedown", this._SetGlichApp.bind(this)));
    }

    rolls ( event ) {
        if (this.actor.system.roll.approach === '' || this.actor.system.roll.skill === ''){
            ui.notifications.warn(game.i18n.localize("WARN.ROLL"));
            return '';
        }

        if ( event.target.classList.contains('resistRoll') ) this.resistRoll();
        else if ( event.target.classList.contains('angelRoll') ) this.angelRoll();
        else if ( event.target.classList.contains('actionRoll') ) this.actionRoll();
        else if ( event.target.classList.contains('breathRoll') ) this.breathRoll();
    }

    setRolls ( event ) {
        if ( event.target.nodeName === "LABEL" ) {
            const selectValue = event.target.innerText;
            const selectType = event.target.parentElement.className;
            this.actor.update({ ["system.roll."+selectType]: selectValue });
        }
    }

    _setSkill (event) {
        const btnClick = 
            (event.which === 1 || event.button === 0) ? "l" :
            (event.which === 2 || event.button === 1) ? "m" :
            (event.which === 3 || event.button === 2) ? "r" : null;
        const skill = event.target.closest('.dots').getAttribute('data-skill').split('.');

        if ( btnClick == "l" )
            this.actor.update({ [`system.${skill.join('.')}.dice`]: Math.min(this.actor.system[skill[0]][skill[1]].dice+1, 2) });
        else if ( btnClick == "r" )
            this.actor.update({ [`system.${skill.join('.')}.dice`]: Math.max(this.actor.system[skill[0]][skill[1]].dice-1,0) });
    }

    _SelectAppSkill ( event ) {
        const app = event.target.getAttribute('data-app');
        const skill = event.target.getAttribute('data-skill');

        if (app)
            this.actor.update({ "system.roll.approach": app });
        else if (skill)
            this.actor.update({ "system.roll.skill": skill });
    }

    _SelectEpx ( event ) {
        const data = event.target.getAttribute('data-exp').split('.');
        this.actor.update({ [`system.skills.${data[0]}.EXPERTISES.${data[1]}`] : !this.actor.system.skills[data[0]].EXPERTISES[data[1]] })
    }

    _SetGlichApp ( event ) {
        const app = event.target.parentElement.parentElement.querySelector('h3').getAttribute('data-app');
        this.actor.update({ [`system.approach.${app}.GLICHED`] : !this.actor.system.approach[app].GLICHED })
    }

    _RunnerOnMouseDown(event) {
        const btnClick =
            (event.which === 1 || event.button === 0) ? "l" :
            (event.which === 2 || event.button === 1) ? "m" :
            (event.which === 3 || event.button === 2) ? "r" : null;

        const section = event.target.closest("section");
        if (!section) return;
        switch (section.classList[0]) {
            case "persona":
                if ( ["DEBT","CRED"].includes(event.target.classList[0]) ){
                    if (btnClick == "l") {
                        this.actor.update({ 
                            [`system.angle.${event.target.classList[0]}.value`]:
                            Math.min(this.actor.system.angle[event.target.classList[0]].value+1, this.actor.system.angle[event.target.classList[0]].max)
                        });
                    }
                    else if (btnClick == "r") {
                        this.actor.update({
                            [`system.angle.${event.target.classList[0]}.value`]: 
                            Math.max(this.actor.system.angle[event.target.classList[0]].value-1,0)
                        });
                    }
                }
            break;
            case "stress":
                if (btnClick == "l") {
                    if (this.actor.system.stress.value+1 == 7 && !this.actor.system.stress.isLOAD) this.overLOAD();
                    this.actor.update({ "system.stress.value": Math.min(this.actor.system.stress.value+1, this.actor.system.stress.max) });
                }
                else if (btnClick == "r")
                    this.actor.update({
                        "system.stress.value": Math.max(this.actor.system.stress.value-1,0),
                        "system.stress.isLOAD": false
                    });
            break;
            case "gear":
                if ( event.target.nodeName === "BUTTON" ) {
                    const loadArr = ["light", "medium", "heavy"];
                    this.actor.update({ 
                        "system.GEAR.LOAD.selected": loadArr[(loadArr.indexOf(this.actor.system.GEAR.LOAD.selected)+1)%loadArr.length]
                    });
                }
                else if ( event.target.classList[0] === "stack" ) {
                    const selectGear = event.target.getAttribute('data-type');
                    if ( selectGear === "eq21" && btnClick == "l" )
                        this.actor.update({
                            [`system.GEAR.Equipment.${selectGear}.stack`] : Math.min(
                                this.actor.system.GEAR.Equipment[selectGear].stack + 1,
                                this.actor.system.GEAR.Equipment[selectGear].max
                            ),
                            [`system.GEAR.LOAD.value`] : this.actor.system.GEAR.LOAD.value +
                                (this.actor.system.GEAR.Equipment[selectGear].stack === this.actor.system.GEAR.Equipment[selectGear].max ? 0 : 1)
                        });
                    else if ( selectGear === "eq21" && btnClick == "r" )
                        this.actor.update({
                            [`system.GEAR.Equipment.${selectGear}.stack`] : Math.max(this.actor.system.GEAR.Equipment[selectGear].stack - 1, 0),
                            [`system.GEAR.LOAD.value`] : Math.max(this.actor.system.GEAR.LOAD.value - 1, 0)
                        });
                    else if ( btnClick == "l" ) 
                        this.actor.update({
                            [`system.GEAR.Equipment.${selectGear}.stack`] : Math.min(
                                this.actor.system.GEAR.Equipment[selectGear].stack + 1,
                                this.actor.system.GEAR.Equipment[selectGear].max
                            )
                        });
                    else if ( btnClick == "r" ) 
                        this.actor.update({
                            [`system.GEAR.Equipment.${selectGear}.stack`] : Math.max(this.actor.system.GEAR.Equipment[selectGear].stack - 1, 0)
                        });
                }
                else if ( event.target.closest('label') ){
                    const selectGear = event.target.closest('label').getAttribute("data-id");
                    const isUse = this.actor.system.GEAR.Equipment[selectGear].isUse;
                    const gearValue = this.actor.system.GEAR.Equipment[selectGear].value;
                    this.actor.update({
                        [`system.GEAR.Equipment.${selectGear}.isUse`] : !isUse,
                        [`system.GEAR.LOAD.value`] : Math.max(0 , (!isUse ? this.actor.system.GEAR.LOAD.value + gearValue : this.actor.system.GEAR.LOAD.value - gearValue)
                        )
                    });
                }
            break;
            case "harm":
                if ( event.target.classList[0] === "track" ){
                    const harmStage = event.target.getAttribute("data-type");
                    if ( btnClick == "l" ) 
                        this.actor.update({
                            [`system.HARM.${harmStage}.value`] : Math.min(this.actor.system.HARM[harmStage].value + 1, this.actor.system.HARM[harmStage].max)
                        });
                    else if ( btnClick == "r" ) 
                        this.actor.update({
                            [`system.HARM.${harmStage}.value`] : Math.max(this.actor.system.HARM[harmStage].value - 1, 0)
                        });
                }
            break;
            default: break;
        }
    }

    async actionRoll(){
        const approachDice = this.actor.system.approach[this.actor.system.roll.approach].dice;
        const skillDice = (this.actor.system.skills[this.actor.system.roll.skill] || {dice: 0}).dice;
        const dataRoll = {
            ...this.actor.system.roll,
            GLICHED:
                this.actor.items.map( ({system}) =>
                    system.isGLICHED && ( !game.settings.get("CBRPNK", "AugGlitchedCheck") || system.isActive )
                ).filter(x => x).length +
                this.actor.system.approach[this.actor.system.roll.approach].GLICHED +
                this.actor.system.roll.isGlichDice,
            dices: `${approachDice} + ${skillDice}`
        }, dicePool = Math.min(6, approachDice + skillDice + (parseInt(dataRoll.addDice) || 0) + (this.actor.system.roll.isGlichDice ? 1 : 0));
        let letsRoll, rollResult = 0;
        const templateData = {
            title: "",
            class: "",
            dices: "",
            img: this.actor.img,
            name: this.actor.name,
            desc: "",
            effect: dataRoll.effect,
            threat: dataRoll.threat,
            action: game.i18n.localize(`Skill.${dataRoll.skill}.name`),
            approach: game.i18n.localize(`Approach.${dataRoll.approach}.name`)
        };

        if ( dicePool <= 0 ) {
            // dis Roll
            letsRoll = await new Roll("2d6").roll();
            rollResult = [Math.min( ...letsRoll.terms[0].results.map( ({result}) => result) )];
        }else {
            // normal Roll
            letsRoll =  await new Roll(dicePool+"d6").roll();
            rollResult = letsRoll.terms[0].results.map( ({result}) => result)
        }

        if (rollResult.filter( dice => dice == 6).length >= 2) {
            templateData.title = game.i18n.localize("ACTION.crit.title");
            templateData.class = "critical";
            templateData.desc = game.i18n.localize("ACTION.crit.desc");
        }
        else if (Math.max(...rollResult) == 6 ) {
            templateData.title = game.i18n.localize("ACTION.succ.title");
            templateData.class = "good";
            templateData.desc = game.i18n.localize("ACTION.succ.desc");
        }
        else if (rollResult.filter( dice => dice == 4 || dice == 5).length ) {
            templateData.title = game.i18n.localize("ACTION.part.title");
            templateData.class = "consequence";
            templateData.desc = game.i18n.localize("ACTION.part.desc");
        }
        else {
            templateData.title = game.i18n.localize("ACTION.fail.title");
            templateData.class = "bad";
            templateData.desc = game.i18n.localize("ACTION.fail.desc");
        }

        if (dataRoll.GLICHED) {
            rollResult.slice(0,dataRoll.GLICHED).forEach( dice => {
                if (dice <= 3) {
                    templateData.desc += `<div class="GLICHED">${dice}: ${game.i18n.localize("ACTION.GLICHED.hard")}</div>`;
                }
                else if ( dice == 4 || dice == 5 ) {
                    templateData.desc += `<div class="GLICHED">${dice}: ${game.i18n.localize("ACTION.GLICHED.normal")}</div>`;
                }
            })
        }

        rollResult.forEach( (dice,index) => {
            const sides = ['one','two', 'three', 'four', 'five', 'six'];
            templateData.dices += `<span class="${index < dataRoll.GLICHED ? "GLICHED" : ""}"><i class="fa-solid fa-dice-${sides[dice-1]}"></i></span>`;
        });

        const content = await renderTemplate('systems/CBRPNK/templates/roll-card.hbs', templateData);

        ChatMessage.create({
            rolls: [letsRoll],
            author: game.user.id,
            speaker: ChatMessage.getSpeaker({token: this.actor}),
            content: content
        });

        if (game.settings.get("CBRPNK", "resetDice")) {
            this.actor.update({ 
                "system.roll.addDice" : 0,
                "system.roll.isGlichDice": false
             });
        }
    }

    async overLOAD() {
        const templateData = {
            title: "",
            class: "overload",
            dices: "",
            img: this.actor.img,
            name: this.actor.name,
            desc: game.i18n.localize("RUNNER.OVERLOAD.desc"),
            action: "",
            approach: game.i18n.localize("RUNNER.OVERLOAD.name")
        };
        const content = await renderTemplate('systems/CBRPNK/templates/roll-card.hbs', templateData);

        ChatMessage.create({
            author: game.user.id,
            speaker: ChatMessage.getSpeaker({token: this.actor}),
            content: content
        });

        this.actor.update({ "system.stress.isLOAD": true });
    }

    async resistRoll() {
        const dataRoll = {
            ...this.actor.system.roll,
            dices: `${this.actor.system.approach[this.actor.system.roll.approach].dice}`
        }, dicePool = Math.min(6, this.actor.system.approach[this.actor.system.roll.approach].dice + (parseInt(dataRoll.addDice) || 0));
        let letsRoll, rollResult = 0, stress = this.actor.system.stress.value;
        const templateData = {
            title: "",
            class: "",
            dices: "",
            img: this.actor.img,
            name: this.actor.name,
            desc: "",
            action: game.i18n.localize("ROLL.ResistRoll"),
            approach: game.i18n.localize(`Approach.${dataRoll.approach}.name`)
        };

        if ( dicePool <= 0 ) {
            // dis Roll
            letsRoll = await new Roll("2d6").roll();
            rollResult = [Math.min( ...letsRoll.terms[0].results.map( ({result}) => result) )];
        }else {
            // normal Roll
            letsRoll =  await new Roll(dicePool+"d6").roll();
            rollResult = letsRoll.terms[0].results.map( ({result}) => result)
        }

        if (rollResult.filter( dice => dice == 6).length == 2) {
            templateData.title = game.i18n.localize("RESIST.crit.title");
            templateData.class = "critical";
            templateData.desc = game.i18n.localize("RESIST.crit.desc");
        }
        else if (Math.max(...rollResult) == 6 ) {
            stress += 1;
            templateData.title = game.i18n.localize("RESIST.succ.title");
            templateData.class = "good";
            templateData.desc = game.i18n.localize("RESIST.succ.desc");
            this.actor.update({ "system.stress.value": Math.min( this.actor.system.stress.value + 1, 7) });
        }
        else if (rollResult.filter( dice => dice == 4 || dice == 5).length ) {
            stress += 2;
            templateData.title = game.i18n.localize("RESIST.part.title");
            templateData.class = "consequence";
            templateData.desc = game.i18n.localize("RESIST.part.desc");
            this.actor.update({ "system.stress.value": Math.min( this.actor.system.stress.value + 2, 7) });
        }
        else {
            stress += 3;
            templateData.title = game.i18n.localize("RESIST.fail.title");
            templateData.class = "bad";
            templateData.desc = game.i18n.localize("RESIST.fail.desc");
            this.actor.update({ "system.stress.value": Math.min( this.actor.system.stress.value + 3, 7) });
        }

        rollResult.forEach( (dice,index) => {
            const sides = ['one','two', 'three', 'four', 'five', 'six'];
            templateData.dices += `<span class="${index < dataRoll.GLICHED ? "GLICHED" : ""}"><i class="fa-solid fa-dice-${sides[dice-1]}"></i></span>`;
        });

        const content = await renderTemplate('systems/CBRPNK/templates/roll-card.hbs', templateData);

        ChatMessage.create({
            rolls: [letsRoll],
            author: game.user.id,
            speaker: ChatMessage.getSpeaker({token: this.actor}),
            content: content
        });
        
        if ( stress >= 7 && !this.actor.system.stress.isLOAD) this.overLOAD();

        if (game.settings.get("CBRPNK", "resetDice")) {
            this.actor.update({ 
                "system.roll.addDice" : 0,
                "system.roll.isGlichDice": false
             });
        }
    }

    async breathRoll() {
        const dataRoll = {
            ...this.actor.system.roll,
            dices: `${this.actor.system.approach[this.actor.system.roll.approach].dice}`
        }, dicePool = Math.min(6, this.actor.system.approach[this.actor.system.roll.approach].dice + (parseInt(dataRoll.addDice) || 0));
        let letsRoll, rollResult = 0;
        const templateData = {
            title: "",
            class: "",
            dices: "",
            img: this.actor.img,
            name: this.actor.name,
            desc: "",
            action: game.i18n.localize("ROLL.BreathRoll"),
            approach: game.i18n.localize(`Approach.${dataRoll.approach}.name`)
        };

        if ( dicePool <= 0 ) {
            // dis Roll
            letsRoll = await new Roll("2d6").roll();
            rollResult = [Math.min( ...letsRoll.terms[0].results.map( ({result}) => result) )];
        }else {
            // normal Roll
            letsRoll =  await new Roll(dicePool+"d6").roll();
            rollResult = letsRoll.terms[0].results.map( ({result}) => result)
        }

        if (rollResult.filter( dice => dice == 6).length == 2) {
            templateData.title = game.i18n.localize("BREATH.crit.title");
            templateData.class = "critical";
            templateData.desc = game.i18n.localize("BREATH.crit.desc");
        }
        else if (Math.max(...rollResult) == 6 ) {
            templateData.title = game.i18n.localize("BREATH.succ.title");
            templateData.class = "good";
            templateData.desc = game.i18n.localize("BREATH.succ.desc");
        }
        else if (rollResult.filter( dice => dice == 4 || dice == 5).length ) {
            templateData.title = game.i18n.localize("BREATH.part.title");
            templateData.class = "consequence";
            templateData.desc = game.i18n.localize("BREATH.part.desc");
        }
        else {
            templateData.title = game.i18n.localize("BREATH.fail.title");
            templateData.class = "bad";
            templateData.desc = game.i18n.localize("BREATH.fail.desc");
            this.actor.update({ 
                "system.stress.value": Math.max( this.actor.system.stress.value - 1, 0),
                "system.stress.isLOAD": false
            });
        }

        rollResult.forEach( (dice,index) => {
            const sides = ['one','two', 'three', 'four', 'five', 'six'];
            templateData.dices += `<span class="${index < dataRoll.GLICHED ? "GLICHED" : ""}"><i class="fa-solid fa-dice-${sides[dice-1]}"></i></span>`;
        });

        const content = await renderTemplate('systems/CBRPNK/templates/roll-card.hbs', templateData);

        ChatMessage.create({
            rolls: [letsRoll],
            author: game.user.id,
            speaker: ChatMessage.getSpeaker({token: this.actor}),
            content: content
        });
        
        if (game.settings.get("CBRPNK", "resetDice")) {
            this.actor.update({ 
                "system.roll.addDice" : 0,
                "system.roll.isGlichDice": false
             });
        }
    }

    async angelRoll() {
        const dataRoll = {
            ...this.actor.system.roll,
            dices: `${this.actor.system.approach[this.actor.system.roll.approach].dice}`
        }, dicePool = Math.min(
            6,
            this.actor.system.approach[this.actor.system.roll.approach].dice + (parseInt(dataRoll.addDice) || 0) + this.actor.system.angle.CRED.value - this.actor.system.angle.DEBT.value
        );
        let letsRoll, rollResult = 0;
        const templateData = {
            title: "",
            class: "",
            dices: "",
            img: this.actor.img,
            name: this.actor.name,
            desc: "",
            action: game.i18n.localize("ROLL.AngelRoll"),
            approach: game.i18n.localize(`Approach.${dataRoll.approach}.name`)
        };
        
        if (dicePool <= 0) {
            letsRoll = await new Roll("2d6").roll();
            rollResult = [Math.min( ...letsRoll.terms[0].results.map( ({result}) => result) )];
        }
        else {
            letsRoll =  await new Roll(dicePool+"d6").roll();
            rollResult = letsRoll.terms[0].results.map( ({result}) => result)
        }

        if (rollResult.filter( dice => dice == 6).length == 2) {
            templateData.title = game.i18n.localize("ANGEL.crit.title");
            templateData.class = "critical";
            templateData.desc = game.i18n.localize("ANGEL.crit.desc");
        }
        else if (Math.max(...rollResult) == 6 ) {
            templateData.title = game.i18n.localize("ANGEL.succ.title");
            templateData.class = "good";
            templateData.desc = game.i18n.localize("ANGEL.succ.desc");
        }
        else if (rollResult.filter( dice => dice == 4 || dice == 5).length ) {
            templateData.title = game.i18n.localize("ANGEL.part.title");
            templateData.class = "consequence";
            templateData.desc = game.i18n.localize("ANGEL.part.desc");
        }
        else {
            templateData.title = game.i18n.localize("ANGEL.fail.title");
            templateData.class = "bad";
            templateData.desc = game.i18n.localize("ANGEL.fail.desc");
        }

        rollResult.forEach( (dice,index) => {
            const sides = ['one','two', 'three', 'four', 'five', 'six'];
            templateData.dices += `<span class="${index < dataRoll.GLICHED ? "GLICHED" : ""}"><i class="fa-solid fa-dice-${sides[dice-1]}"></i></span>`;
        });

        const content = await renderTemplate('systems/CBRPNK/templates/roll-card.hbs', templateData);

        ChatMessage.create({
            rolls: [letsRoll],
            author: game.user.id,
            speaker: ChatMessage.getSpeaker({token: this.actor}),
            content: content
        });
    }

    _DeleteItem( event ) {
        this.actor.deleteEmbeddedDocuments("Item", [
            event.target.closest(".aug").getAttribute("data-item-id")
        ]);
    }

    _AddItem( event ) {
        switch ( event.target.closest('section').classList[0] ) {
            case "augmentations":
                Item.create({
                    name: "Aug",
                    type: "augmentation"
                }, { parent: this.actor });
            break;
            default: break;
        }
    }

    _ToggleGlitch( event ) {
        const item = this.actor.items.get(event.target.closest(".aug").getAttribute("data-item-id"));
        item.update({ "system.isGLICHED": !item.system.isGLICHED });
    }

    _itemName( event ) {
        const item = this.actor.items.get(event.target.closest(".aug").getAttribute("data-item-id"));
        if ( event.target.value === "" || event.target.value === null ) return;
        item.update({ "name": event.target.value });
    }

    _itemOpen( event ) {
        const item = this.actor.items.get(event.target.closest(".aug").getAttribute("data-item-id"));
        item.update({ "system.isOpen": !item.system.isOpen });
    }

    _itemActive( event ) {
        const item = this.actor.items.get(event.target.closest(".aug").getAttribute("data-item-id"));
        item.update({ "system.isActive": !item.system.isActive });
    }

    _itemEdit( event ) {
        this.actor.items.get( 
            event.target.closest(".aug").getAttribute("data-item-id")
        ).sheet.render(true);
    }
}