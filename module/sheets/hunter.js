export default class cbrHunter extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.DocumentSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["sheet", "actor", "hunter"],
        position: { width: 600, height: 700 },
        form: { closeOnSubmit: false }
    };

    static PARTS = {
        form: { template: "systems/CBRPNK/templates/sheets/hunter.hbs" }
    };

    get actor() { return this.document; }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.actor = this.actor;
        context.system = this.actor.system;
        context.editable = this.isEditable;
        context.owner = this.actor.isOwner;
        const enrichOpts = { relativeTo: this.actor, secrets: this.actor.isOwner, rollData: this.actor.getRollData?.() };
        context.enrichedDesc        = await TextEditor.enrichHTML(this.actor.system.desc ?? "", enrichOpts);
        context.enrichedAugDesc     = await TextEditor.enrichHTML(this.actor.system.AUGMENTATION.desc ?? "", enrichOpts);
        context.enrichedAbilityDesc = await TextEditor.enrichHTML(this.actor.system.Ability.desc ?? "", enrichOpts);
        return context;
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const windowContent = this.element.querySelector(".window-content");
        if (windowContent) {
            windowContent.style.overflowY = "auto";
            const part = windowContent.querySelector("[data-application-part]");
            if (part) part.style.overflow = "visible";
        }

        const form = this.element.querySelector("form");
        if (!form) return;

        this.element.querySelectorAll("img[data-edit]").forEach(img => {
            img.style.cursor = "pointer";
            img.addEventListener("click", async () => {
                if (!this.isEditable) return;
                const field = img.dataset.edit;
                const current = foundry.utils.getProperty(this.actor, field);
                new FilePicker({
                    type: "image",
                    current: current,
                    callback: path => this.actor.update({ [field]: path })
                }).browse();
            });
        });

        form.addEventListener("change", async () => {
            if (!this.isEditable) return;
            const fd = new FormDataExtended(form);
            await this.document.update(foundry.utils.expandObject(fd.object));
        });

        form.addEventListener("mousedown", this._HunterOnMouseDown.bind(this));
    }

    _HunterOnMouseDown(event) {
        const btnClick = 
            (event.which === 1 || event.button === 0) ? "l" :
            (event.which === 2 || event.button === 1) ? "m" :
            (event.which === 3 || event.button === 2) ? "r" : null;

        if (!event.target.closest(".track")) return ;
        if ( event.target.closest(".track").getAttribute("data-name").match("RANK") ) {
            const rank = event.target.closest(".track").getAttribute("data-name");
            if (btnClick == "l")
                this.actor.update({ 
                    [`system.${rank}.stack`]: Math.min(this.actor.system[rank].stack+1, this.actor.system[rank].max)
                });
            else if (btnClick == "r")
                this.actor.update({ 
                    [`system.${rank}.stack`]: Math.max(this.actor.system[rank].stack-1, 0)
                });
        }
        else if (event.target.closest(".track").getAttribute("data-name").match("activation") ) {
            const skill = event.target.closest(".track").getAttribute("data-name");
            if (btnClick == "l")
                this.actor.update({ 
                    [`system.${skill}.value`]: Math.min(this.actor.system[skill].value+1, this.actor.system[skill].max)
                });
            else if (btnClick == "r")
                this.actor.update({ 
                    [`system.${skill}.value`]: Math.max(this.actor.system[skill].value-1, 0)
                });
        }
        else if (event.target.closest(".track").getAttribute("data-name").match("counter") ) {
            const skill = event.target.closest(".track").getAttribute("data-name");
            if (btnClick == "l")
                this.actor.update({ 
                    [`system.${skill}.value`]: Math.min(this.actor.system[skill].value+1, this.actor.system[skill].max)
                });
            else if (btnClick == "r")
                this.actor.update({ 
                    [`system.${skill}.value`]: Math.max(this.actor.system[skill].value-1, 0)
                });
        }
    }
}