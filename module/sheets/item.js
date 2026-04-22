export default class cbrItem extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.DocumentSheetV2) {
    static DEFAULT_OPTIONS = {
        position: { width: 600, height: 350 },
        form: { submitOnChange: true, closeOnSubmit: false }
    };

    static PARTS = {
        form: { template: "" }
    };

    get item() { return this.document; }

    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        this.constructor.PARTS.form.template = `systems/CBRPNK/templates/sheets/items/${this.item.type}.hbs`;
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.item = this.item;
        context.system = this.item.system;
        context.editable = this.isEditable;
        context.owner = this.item.isOwner;
        return context;
    }

    _onRender(context, options) {
        const form = this.element.querySelector("form");
        if (!form) return;
        form.querySelector(`#${this.item.id}_addStack`)?.addEventListener("mousedown", this._changeStack.bind(this));
    }

    _changeStack(event) {
        const btnClick = 
            (event.which === 1 || event.button === 0) ? "l" :
            (event.which === 2 || event.button === 1) ? "m" :
            (event.which === 3 || event.button === 2) ? "r" : null;
        
        switch (btnClick) {
            case "l":
                this.item.update({ "system.maxStack" : this.item.system.maxStack + 1 });
                break;
            case "r":
                this.item.update({ "system.maxStack" : Math.max(this.item.system.maxStack - 1,0) });
                break;
            default:
                break;
        }
    }
}