/**
 * swade-adapter.mjs
 * Adaptador do sistema SWADE para o Stylish Action HUD.
 * Implementa a interface BaseSystemAdapter requerida.
 *
 * SWADE system adapter for Stylish Action HUD.
 * Implements the required BaseSystemAdapter interface.
 */
import { useConsumable } from "./swade-StylishActionHud-consumables.mjs";

export class SwadeSystemAdapter {
    constructor() {
        this.systemId = "swade";
    }

    /**
     * OBRIGATÓRIO: Obtém condições ativas (Shaken, Distracted, etc) para exibição.
     * A falta deste método causava o erro "hud.adapter.getConditions is not a function".
     *
     * REQUIRED: Gets active conditions (Shaken, Distracted, etc) for display.
     * Missing this method caused "hud.adapter.getConditions is not a function" error.
     * @param {Actor} actor
     * @returns {Array}
     */
    getConditions(actor) {
        // Em SWADE/Foundry, pegamos os efeitos temporários
        // In SWADE/Foundry, we get temporary effects
        const effects = actor.temporaryEffects || [];

        return effects
            .filter(e => e.img && !e.disabled) // Filtra efeitos sem ícone ou desabilitados / Filters effects without icon or disabled
            .map((e) => ({
                id: e.id || e.name,
                src: e.img,
                name: e.name || e.label || "Unknown",
                value: null // SWADE geralmente não usa contadores numéricos para condições / SWADE usually doesn't use numeric counters for conditions
            }));
    }

    /**
     * OBRIGATÓRIO: Obtém estatísticas do ator para o HUD (Vida, Fadiga, Bennies, etc)
     * REQUIRED: Gets actor stats for the HUD (Wounds, Fatigue, Bennies, etc)
     * @param {Actor} actor
     * @param {Array} configAttributes
     */
    getStats(actor, configAttributes) {
        if (!configAttributes || configAttributes.length === 0) return [];

        return configAttributes.map((attr) => {
            const raw = foundry.utils.getProperty(actor, attr.path);
            let value = 0;
            let max = 0;

            if (typeof raw === "object" && raw !== null) {
                value = raw.value ?? 0;
                max = raw.max ?? 0;
            } else if (typeof raw === "number") {
                value = raw;
            }

            // Calcula porcentagem para barras
            // Calculates percentage for bars
            let percent = 0;
            if (max > 0) {
                percent = Math.clamp((value / max) * 100, 0, 100);
            }

            return {
                path: attr.path,
                label: attr.label,
                color: attr.color,
                value: value,
                max: max,
                percent: percent,
                style: attr.style || "bar",
                subtype: "resource",
                x: attr.x || 0,
                y: attr.y || 0,
            };
        });
    }

    /**
     * OBRIGATÓRIO: Define categorias do menu de ação
     * REQUIRED: Defines action menu categories
     */
    getActionCategories(actor) {
        return [
            { id: "attributes", systemId: "attributes", label: "Atributos", icon: "fas fa-dice", type: "submenu" },
            { id: "skills", systemId: "skills", label: "Perícias", icon: "fas fa-tools", type: "submenu" },
            { id: "powers", systemId: "powers", label: "Poderes", icon: "fas fa-bolt", type: "submenu" },
            { id: "inventory", systemId: "inventory", label: "Inventário", icon: "fas fa-suitcase", type: "submenu" },
            { id: "utility", systemId: "utility", label: "Utilidade", icon: "fas fa-cog", type: "submenu" }
        ];
    }

    /**
     * OBRIGATÓRIO: Obtém dados do submenu para uma categoria
     * REQUIRED: Gets submenu data for a category
     */
    async getSubMenuData(actor, categoryId) {
        // Mapeia o ID da categoria para o método correspondente
        // Maps category ID to the corresponding method
        let systemId = categoryId;

        if (categoryId.startsWith("attributes")) systemId = "attributes";
        else if (categoryId.startsWith("skills")) systemId = "skills";
        else if (categoryId.startsWith("powers")) systemId = "powers";
        else if (categoryId.startsWith("inventory")) systemId = "inventory";
        else if (categoryId.startsWith("utility")) systemId = "utility";

        switch (systemId) {
            case "attributes":
                return this._getAttributes(actor);
            case "skills":
                return this._getSkills(actor);
            case "powers":
                return this._getPowers(actor);
            case "inventory":
                return this._getInventory(actor);
            case "utility":
                return this._getUtility(actor);
            default:
                return { title: "", items: [] };
        }
    }

    /* Métodos Auxiliares Privados */
    /* Private Helper Methods */

    _getAttributes(actor) {
        const attributes = actor.system.attributes;
        const items = [];
        for (const [key, attr] of Object.entries(attributes)) {
            items.push({
                id: key,
                name: game.i18n.localize(CONFIG.SWADE.attributes[key].long),
                img: "icons/svg/d20-grey.svg",
                description: `d${attr.die.sides}${attr.die.modifier ? (attr.die.modifier > 0 ? "+" : "") + attr.die.modifier : ""}`
            });
        }
        return { title: "Atributos", items, hasTabs: false };
    }

    _getSkills(actor) {
        const skills = actor.items.filter(i => i.type === "skill");
        return {
            title: "Perícias",
            items: skills.map(s => ({
                id: s.id,
                name: s.name,
                img: s.img,
                description: `d${s.system.die.sides}`
            })),
            hasTabs: false
        };
    }

    _getPowers(actor) {
        const powers = actor.items.filter(i => i.type === "power");
        return {
            title: "Poderes",
            items: powers.map(p => ({
                id: p.id,
                name: p.name,
                img: p.img,
                cost: p.system.pp ? `${p.system.pp} PP` : ""
            })),
            hasTabs: false
        };
    }

    _getInventory(actor) {
        const weapons = actor.items.filter(i => i.type === "weapon");
        const gear = actor.items.filter(i => i.type === "gear" || i.type === "equipment");
        const consumables = actor.items.filter(i => i.type === "consumable");

        return {
            title: "Inventário",
            hasTabs: true,
            items: {
                weapons: weapons.map(w => ({ id: w.id, name: w.name, img: w.img })),
                gear: gear.map(g => ({ id: g.id, name: g.name, img: g.img })),
                consumables: consumables.map(c => ({ id: c.id, name: c.name, img: c.img }))
            },
            tabLabels: {
                weapons: "Armas",
                gear: "Equipamento",
                consumables: "Consumíveis"
            }
        };
    }

    _getUtility(actor) {
        return {
            title: "Utilidade",
            items: [
                { id: "benny", name: "Gastar Benny", img: "systems/swade/assets/benny.webp" }
            ]
        };
    }

    /**
     * Executa ações diretas (clique no botão)
     * Executes direct actions (button click)
     */
    async executeAction(actor, actionId) {
        if (["agility", "smarts", "spirit", "strength", "vigor"].includes(actionId)) {
            return actor.rollAttribute(actionId);
        }

        if (actionId === "benny") {
            if (actor.isOwner && actor.system.bennies.value > 0) {
                await actor.update({ "system.bennies.value": actor.system.bennies.value - 1 });
                ChatMessage.create({ content: `${actor.name} gastou um Benny!` });
            }
        }
    }

    /**
     * Usa um item (clique no botão de item)
     * Uses an item (item button click)
     */
    async useItem(actor, itemId) {
        return useConsumable(actor, itemId);
    }
}