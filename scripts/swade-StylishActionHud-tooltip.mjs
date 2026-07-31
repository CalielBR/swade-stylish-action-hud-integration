const MODULE_ID = "swade-StylishActionHud-integration";
const TOOLTIP_ID = "swade-hud-tooltip";
const SHOW_DELAY = 380;
const HIDE_DELAY = 250;

let _showTimer = null;
let _hideTimer = null;

console.log("SWADE | Tooltip script loaded");

Hooks.once("init", () => {
	game.settings.register(MODULE_ID, "enableTooltip", {
		name: "Ativar Tooltip de Itens",
		hint: "Mostra um tooltip com a descrição do item ao passar o mouse sobre ele no HUD. Desative se preferir não ver esse popup.",
		scope: "client",
		config: true,
		type: Boolean,
		default: true,
		onChange: (enabled) => {
			if (!enabled) _hide(true);
		},
	});

	game.settings.register(MODULE_ID, "tooltipScale", {
		name: "Escala do Tooltip de Itens",
		hint: "Ajusta o tamanho geral do tooltip que aparece ao passar o mouse sobre um item (fonte, ícone e espaçamento). 1.0 = tamanho padrão.",
		scope: "client",
		config: true,
		type: Number,
		range: { min: 0.6, max: 2, step: 0.05 },
		default: 1,
		onChange: () => {
			const el = document.getElementById(TOOLTIP_ID);
			if (el) _applyScale(el);
		},
	});
});

Hooks.once("stylish-action-hud.apiReady", () => {
	console.log("SWADE | Tooltip initializing...");
	const el = document.createElement("div");
	el.id = TOOLTIP_ID;
	document.body.appendChild(el);

	el.addEventListener("mouseenter", () => clearTimeout(_hideTimer));
	el.addEventListener("mouseleave", () => _scheduleHide());

	const SA = window.StylishAction;
	if (!SA) return;

	const origShow = SA.showTooltip;
	if (typeof origShow !== "function") return;

	SA.showTooltip = function (itemId, event) {
		origShow.call(SA, itemId, event);

		clearTimeout(_hideTimer);
		clearTimeout(_showTimer);

		if (!game.settings.get(MODULE_ID, "enableTooltip")) return;

		const actor = SA.currentActor;
		if (!actor) return;

		const realId = String(itemId).split("_")[0];
		const item = actor.items.get(realId);
		if (!item) return;
		if (!item.system?.description?.trim()) return;

		_showTimer = setTimeout(() => _show(itemId), SHOW_DELAY);
	};

	const origHide = SA.hideTooltip;
	if (typeof origHide === "function") {
		SA.hideTooltip = function (force) {
			origHide.call(SA, force);
			clearTimeout(_showTimer);
			_scheduleHide();
		};
	}

	Hooks.on("stylish-action-hud.renderSubMenu", () => _hide());
});

function _scheduleHide() {
	clearTimeout(_hideTimer);
	_hideTimer = setTimeout(() => _hide(), HIDE_DELAY);
}

async function _show(itemId) {
	if (!game.settings.get(MODULE_ID, "enableTooltip")) return;

	const actor = window.StylishAction?.currentActor;
	if (!actor) return;

	const realId = String(itemId).split("_")[0];
	const item = actor.items.get(realId);
	if (!item) return;

	const desc = item.system?.description || "";
	if (!desc.trim()) return;

	let enriched = "";
	try {
		enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(desc, {
			async: true,
			relativeTo: item,
			rollData: item.getRollData ? item.getRollData() : undefined,
		});
	} catch (e) {
		enriched = desc;
	}

	const el = document.getElementById(TOOLTIP_ID);
	if (!el) return;

	el.innerHTML = `
		<div class="swade-tooltip-header">
			${item.img ? `<img src="${item.img}" width="32" height="32" alt="">` : ""}
			<div>
				<div class="swade-tooltip-title">${item.name}</div>
				<div class="swade-tooltip-type">${item.type.toUpperCase()}</div>
			</div>
		</div>
		${enriched ? `<div class="editor-content swade-tooltip-body">${enriched}</div>` : ""}
	`;

	_applyTheme(el);
	_applyScale(el);
	_position(el);
	el.classList.add("active");
}

function _applyScale(el) {
	let scale = 1;
	try {
		scale = Number(game.settings.get(MODULE_ID, "tooltipScale")) || 1;
	} catch (e) {
		scale = 1;
	}
	el.style.setProperty("--swade-tooltip-scale", scale);
}

function _applyTheme(el) {
	const config = game.settings.get("stylish-action-hud", "configuration") || {};
	const theme = config.theme || "iron";

	el.className = "swade-tooltip";
	el.classList.add(`theme-${theme}`);

	if (config.actionMenuFont) {
		el.style.setProperty("--swade-font", `'${config.actionMenuFont}'`);
	}

	const ref = document.getElementById("ib-rich-tooltip");
	if (!ref) return;

	const cs = getComputedStyle(ref);
	const skip = ["rgba(0, 0, 0, 0)", "transparent", "none", ""];

	const bgImg = cs.getPropertyValue("background-image");
	if (bgImg && !skip.includes(bgImg)) el.style.backgroundImage = bgImg;

	const bgCol = cs.getPropertyValue("background-color");
	if (bgCol && !skip.includes(bgCol)) el.style.backgroundColor = bgCol;

	const bc = cs.getPropertyValue("border-top-color");
	if (bc && !skip.includes(bc)) el.style.borderColor = bc;

	const txt = cs.getPropertyValue("color");
	if (txt && !skip.includes(txt)) el.style.color = txt;

	const bs = cs.getPropertyValue("box-shadow");
	if (bs && !skip.includes(bs)) el.style.boxShadow = bs;

	const br = cs.getPropertyValue("border-radius");
	if (br && br !== "0px") el.style.borderRadius = br;

	const bw = cs.getPropertyValue("border-top-width");
	if (bw && bw !== "0px") el.style.borderWidth = bw;

	const ff = cs.getPropertyValue("font-family");
	if (ff) el.style.fontFamily = ff;

	const vars = ["--tooltip-bg", "--tooltip-border", "--tooltip-text", "--tooltip-header", "--g-accent", "--p-red", "--p-white", "--p-black"];
	for (const v of vars) {
		const val = cs.getPropertyValue(v).trim();
		if (val) el.style.setProperty(v, val);
	}
}

function _position(el) {
	const sub = document.getElementById("ib-sub-menu-container");

	const gap = 14;
	const pad = 10;

	if (!sub || sub.offsetHeight === 0) {
		el.style.left = `${pad}px`;
		el.style.right = "auto";
		el.style.bottom = `${pad + 60}px`;
		el.style.top = "auto";
		el.style.transform = "none";
		return;
	}

	const sr = sub.getBoundingClientRect();
	const avail = sr.left - gap - pad;

	// Horizontal: always to the left of the sub-menu panel.
	el.style.right = `${window.innerWidth - sr.left + gap}px`;
	el.style.left = "auto";
	el.style.maxWidth = `${Math.max(200, Math.min(460, avail))}px`;

	// Scale grows away from the sub-menu (top-right anchor stays fixed),
	// so the tooltip stays glued to the panel at any scale.
	el.style.transformOrigin = "top right";
	el.style.transform = "scale(var(--swade-tooltip-scale, 1))";

	// Vertical: align with the top of the sub-menu, clamped so it never
	// runs off the top or bottom of the viewport. getBoundingClientRect
	// already reflects the CSS transform scale applied above.
	el.style.bottom = "auto";
	el.style.top = "0px";
	const scaledHeight = el.getBoundingClientRect().height || el.offsetHeight || 200;
	let top = sr.top;
	const maxTop = window.innerHeight - scaledHeight - pad;
	if (top > maxTop) top = maxTop;
	if (top < pad) top = pad;
	el.style.top = `${top}px`;
}

function _hide(immediate = false) {
	const el = document.getElementById(TOOLTIP_ID);
	if (!el) return;

	if (immediate) {
		clearTimeout(_showTimer);
		clearTimeout(_hideTimer);
		el.classList.remove("active");
		el.innerHTML = "";
		el.removeAttribute("style");
		el.className = "swade-tooltip";
		return;
	}

	el.classList.remove("active");
	setTimeout(() => {
		if (!el.classList.contains("active")) {
			el.innerHTML = "";
			el.removeAttribute("style");
			el.className = "swade-tooltip";
		}
	}, 200);
}
