export function drawClockSVG(svgEl, segments, filled) {
    const cx = 50, cy = 50, r = 46;
    svgEl.innerHTML = "";
    svgEl.setAttribute("viewBox", "0 0 100 100");

    for (let i = 0; i < segments; i++) {
        const start = (i / segments) * 2 * Math.PI - Math.PI / 2;
        const end   = ((i + 1) / segments) * 2 * Math.PI - Math.PI / 2;
        const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
        const large = (end - start) > Math.PI ? 1 : 0;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`);
        path.setAttribute("fill",         i < filled ? "rgb(255,231,0)" : "rgb(47,47,47)");
        path.setAttribute("stroke",       "rgb(255,231,0)");
        path.setAttribute("stroke-width", "2");
        path.dataset.segment = i + 1;
        svgEl.appendChild(path);
    }
}

export default class cbrClock extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.DocumentSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["sheet", "item", "clock"],
        position: { width: 320, height: 400 },
        form: { closeOnSubmit: false }
    };

    static PARTS = {
        form: { template: "systems/CBRPNK/templates/sheets/items/clock.hbs" }
    };

    get item() { return this.document; }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.item    = this.item;
        context.system  = this.item.system;
        context.editable = this.isEditable;
        context.enrichedDesc = await TextEditor.enrichHTML(
            this.item.system.desc ?? "",
            { relativeTo: this.item, secrets: this.item.isOwner }
        );
        return context;
    }

    _onRender(context, options) {
        super._onRender(context, options);

        // Scroll fix V12
        const wc = this.element.querySelector(".window-content");
        if (wc) { wc.style.overflowY = "auto"; const p = wc.querySelector("[data-application-part]"); if (p) p.style.overflow = "visible"; }

        const form = this.element.querySelector("form");
        if (!form) return;

        // Desenha SVG
        const svg = form.querySelector(".clock-svg");
        if (svg) drawClockSVG(svg, this.item.system.segments, this.item.system.filled);

        // Clique em segmento: preenche até aquele segmento (ou esvazia se já estava)
        svg?.addEventListener("click", (event) => {
            if (!this.isEditable) return;
            const seg = parseInt(event.target.dataset.segment);
            if (!seg) return;
            const filled = this.item.system.filled === seg ? seg - 1 : seg;
            this.item.update({ "system.filled": Math.max(0, Math.min(filled, this.item.system.segments)) });
        });

        // Botão direito: remove um segmento
        svg?.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            if (!this.isEditable) return;
            this.item.update({ "system.filled": Math.max(0, this.item.system.filled - 1) });
        });

        // submitOnChange manual
        form.addEventListener("change", async () => {
            if (!this.isEditable) return;
            const fd = new FormDataExtended(form);
            await this.document.update(foundry.utils.expandObject(fd.object));
        });
    }
}
