export default class cbrItem extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.DocumentSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["sheet", "item"],
        position: { width: 600, height: 350 },
        form: { closeOnSubmit: false }
    };

    static PARTS = {
        form: { template: "" }
    };

    get item() { return this.document; }

    async _renderHTML(context, options) {
        const template = `systems/CBRPNK/templates/sheets/items/${this.item.type}.hbs`;
        return { form: await renderTemplate(template, context) };
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.item = this.item;
        context.system = this.item.system;
        context.editable = this.isEditable;
        context.owner = this.item.isOwner;
        context.enrichedDesc = await TextEditor.enrichHTML(
            this.item.system.desc ?? "",
            { relativeTo: this.item, secrets: this.item.isOwner, rollData: this.item.getRollData?.() }
        );
        return context;
    }

    _onRender(context, options) {
        super._onRender(context, options);
        const form = this.element.querySelector("form");
        if (!form) return;

        this.element.querySelectorAll("img[data-edit]").forEach(img => {
            img.style.cursor = "pointer";
            img.addEventListener("click", async () => {
                if (!this.isEditable) return;
                const field = img.dataset.edit;
                const current = foundry.utils.getProperty(this.item, field);
                new FilePicker({
                    type: "image",
                    current: current,
                    callback: path => this.item.update({ [field]: path })
                }).browse();
            });
        });

        form.addEventListener("change", async () => {
            if (!this.isEditable) return;
            const fd = new FormDataExtended(form);
            await this.document.update(foundry.utils.expandObject(fd.object));
        });

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