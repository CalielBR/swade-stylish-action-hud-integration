/**
 * swade-StylishActionHud-main.mjs
 * Orchestrator for SWADE and Stylish HUD, using only native system rolls/Activities.
 * Focus: Clean names, no technical prefixes, and full automation.
 *
 * Orquestrador para SWADE e Stylish HUD, usando apenas rolagens/Activities nativas do sistema.
 * Foco: Nomes limpos, sem prefixos técnicos e automação total.
 */

import { rollAttribute } from './swade-StylishActionHud-attributes.mjs';
import { rollSkill } from './swade-StylishActionHud-skills.mjs';
import { rollCombat } from './swade-StylishActionHud-combat.mjs';
import { rollPower } from './swade-StylishActionHud-powers.mjs';
import { useConsumable } from './swade-StylishActionHud-consumables.mjs';

// WORKAROUND: Fix for "app.element.find is not a function" error in V13
// The main Stylish Action HUD module tries to use jQuery .find() on native elements
//
// WORKAROUND: Correção para erro "app.element.find is not a function" no V13
// O módulo principal do Stylish Action HUD tenta usar jQuery .find() em elementos nativos
if (typeof HTMLElement !== "undefined" && !HTMLElement.prototype.find) {
    HTMLElement.prototype.find = function (selector) {
        return $(this).find(selector);
    };
}

// WORKAROUND: Suppresses 'message.user' deprecation warning from other modules.
// The SWADE system for v12+ uses 'message.author', but older modules (like Stylish Action HUD)
// might still access 'message.user'. This attaches the 'user' property to the message object
// before other hooks access it, preventing the SWADE compatibility getter from triggering,
// which generates the console warning.
//
// WORKAROUND: Suprime o aviso de depreciação de 'message.user' vindo de outros módulos.
// O sistema SWADE para v12+ usa 'message.author', mas módulos mais antigos (como o Stylish Action HUD)
// podem ainda acessar 'message.user'. Isso anexa a propriedade 'user' ao objeto de mensagem
// antes que outros hooks a acessem, evitando o acionamento do getter de compatibilidade do SWADE,
// que gera o aviso no console.
Hooks.on('preCreateChatMessage', (message) => {
    if (message.author && !Object.hasOwn(message, 'user')) {
        // In V13, `message.user` is a getter that logs a deprecation warning.
        // We cannot assign a value directly. Instead, we define it as a new
        // property on the instance to prevent the prototype getter from being called.
        //
        // Em V13, `message.user` é um getter que loga um aviso de depreciação.
        // Não podemos atribuir um valor diretamente. Em vez disso, definimos como uma nova
        // propriedade na instância para evitar que o getter no protótipo seja chamado.
        Object.defineProperty(message, 'user', {
            value: message.author,
            configurable: true
        });
    }
});

Hooks.once("stylish-action-hud.apiReady", (api) => {
    class SwadeIntegrationAdapter {
        constructor() {
            this.systemId = "swade";
        }

        /**
         * Smart Cleaning: Removes 'SWADE.' and 'Attr' prefixes only from technical keys.
         * Prevents 'Attributes' from becoming 'Ibutes'.
         *
         * Limpeza Inteligente: Remove prefixos 'SWADE.' e 'Attr' apenas de chaves técnicas.
         * Evita que a palavra 'Attributes' vire 'Ibutes'.
         */
        _cleanLabel(label, isInternalKey = false) {
            if (!label) return "";

            // If the label doesn't have the system dot (SWADE.), it's already clean.
            // Se o label não tem o ponto do sistema (SWADE.), ele já está limpo.
            if (!label.includes(".")) return label;

            // Gets only the last part after the dot (e.g. AttrAgility)
            // Pega apenas a última parte após o ponto (ex: AttrAgility)
            let clean = label.split(".").pop();

            // If it's an internal attribute key, remove the "Attr" prefix
            // Se for uma chave interna de atributo, removemos o "Attr" prefixado
            if (isInternalKey) {
                clean = clean.replace(/^Attr/, "");
            }

            // Returns capitalized (e.g. Agility)
            // Retorna capitalizado (ex: Agility)
            return clean.charAt(0).toUpperCase() + clean.slice(1);
        }

        /**
         * Gets actor stats for the HUD.
         * Supports user-configured attributes and defaults.
         *
         * Obtém estatísticas do ator para o HUD.
         * Suporta atributos configurados pelo usuário e defaults.
         */
        getStats(actor, configAttributes) {
            if (!configAttributes || configAttributes.length === 0) return [];

            // Default color mapping for fallback (Fix for gray bars)
            // Mapeamento de cores padrão para fallback (Correção para barras cinzas)
            const defaultColors = {
                "system.wounds": "#e61c34",
                "system.fatigue": "#f39c12",
                "system.bennies": "#2ecc71",
                "system.powerPoints.general": "#3498db"
            };

            return configAttributes.map((attr) => {
                // Guard for an attribute row with no path configured yet (e.g. the user
                // just added a new "blank" attribute row in the HUD settings screen).
                // Without this, `attr.path.includes(...)` below throws and breaks the
                // whole HUD for every actor, not just the one being edited.
                //
                // Proteção para uma linha de atributo sem path configurado ainda (ex: o
                // usuário acabou de adicionar uma nova linha "em branco" na tela de
                // configuração do HUD). Sem isso, `attr.path.includes(...)` abaixo lança
                // erro e quebra o HUD inteiro para todos os atores, não só o que está
                // sendo editado.
                if (!attr.path || attr.path.trim() === "") {
                    return {
                        path: "",
                        label: attr.label || "New Attribute",
                        color: attr.color || "#cccccc",
                        value: 3,
                        max: 5,
                        percent: 60,
                        style: attr.style || "bar",
                        subtype: "resource",
                        icon: attr.icon,
                        img: attr.img
                    };
                }

                const raw = foundry.utils.getProperty(actor, attr.path);
                let value = 0;
                let max = 0;

                if (typeof raw === "object" && raw !== null) {
                    value = raw.value ?? 0;
                    max = raw.max ?? 0;
                } else if (typeof raw === "number") {
                    value = raw;
                }

                // Fallback for Wounds and Fatigue Max if 0 (e.g. path pointing to .value)
                // Fallback para Max de Ferimentos e Fadiga se for 0 (ex: path apontando para .value)
                if (max === 0) {
                    // SWADE Default (4 wounds before incapacitated)
                    // Padrão SWADE (4 ferimentos antes de incapacitado)
                    if (attr.path.includes("wounds")) max = 4;
                    // SWADE Default (2 fatigue before exhausted)
                    // Padrão SWADE (2 fadiga antes de exausto)
                    if (attr.path.includes("fatigue")) max = 2;
                }

                let percent = 0;
                // Invert bar for Wounds and Fatigue (0 is full/good)
                // Inverte a barra para Ferimentos e Fadiga (0 é cheio/bom)
                if (attr.path.includes("wounds") || attr.path.includes("fatigue")) {
                    if (max > 0) {
                        percent = Math.clamp(((max - value) / max) * 100, 0, 100);
                    } else {
                        percent = value > 0 ? 0 : 100;
                    }
                } else {
                    if (max > 0) {
                        percent = Math.clamp((value / max) * 100, 0, 100);
                    }
                }

                // Robust Color Logic: Configured > Specific Default > Generic Default (PP) > Gray
                // Lógica de Cor Robusta: Configurada > Padrão Específica > Padrão Genérica (PP) > Cinza
                let color = attr.color;
                if (!color || color === "#cccccc") {
                    if (defaultColors[attr.path]) {
                        color = defaultColors[attr.path];
                    } else if (attr.path.includes("powerPoints")) {
                        color = "#3498db";
                    } else {
                        color = "#cccccc";
                    }
                }

                const stat = {
                    path: attr.path,
                    label: game.i18n.localize(attr.label),
                    color: color,
                    value: value,
                    max: max,
                    percent: percent,
                    style: attr.style || "bar",
                    subtype: "resource",
                    icon: attr.icon,
                    img: attr.img
                };

                // Adds specific icon for Bennies (Badge)
                // Adiciona ícone específico para Bennies (Badge)
                if (attr.path.includes("bennies")) {
                    if (!stat.img && !stat.icon) {
                        stat.img = "systems/swade/assets/benny.webp";
                        // Default icon for Badge
                        // Icone padrão para Badge
                        stat.icon = "fa-solid fa-bullseye";
                    }
                }

                // Adds icons for Parry and Toughness badges (inspired by D&D AC)
                // Adiciona ícones para badges de Aparar e Resistência (inspirado no AC do D&D)
                if (attr.style === 'badge' || attr.style === 'number') {
                    if (attr.path.includes("parry") && !stat.icon && !stat.img) {
                        stat.icon = "fa-solid fa-shield";
                    }
                    if (attr.path.includes("toughness") && !stat.icon && !stat.img) {
                        // Using a different icon to distinguish from Parry
                        // Usando um ícone diferente para distinguir de Parry
                        stat.icon = "fa-solid fa-shield-heart";
                    }
                }

                return stat;
            });
        }

        /**
         * REQUIRED: Gets active conditions (Shaken, Distracted, etc) for HUD display.
         * Fixes "hud.adapter.getConditions is not a function" error.
         *
         * FOUNDRY V14 FIX: ActiveEffect#isTemporary no longer returns true just because
         * the effect has `statuses` (e.g. Shaken). On V13 this happened automatically, so
         * `actor.temporaryEffects` used to include them. On V14 it doesn't anymore, which made
         * SWADE conditions silently disappear from the HUD. We now read `actor.appliedEffects`
         * (falling back to `actor.effects` on older versions) and accept an effect if it has a
         * duration OR has `statuses`, restoring the old V13 behavior.
         *
         * OBRIGATÓRIO: Obtém condições ativas (Shaken, Distracted, etc) para exibição no HUD.
         * Corrige o erro "hud.adapter.getConditions is not a function".
         *
         * CORREÇÃO FOUNDRY V14: ActiveEffect#isTemporary deixou de retornar true apenas por o
         * efeito ter `statuses` (ex: Shaken). No V13 isso acontecia automaticamente, então
         * `actor.temporaryEffects` os incluía. No V14 isso não ocorre mais, o que fazia as
         * condições do SWADE desaparecerem silenciosamente do HUD. Agora lemos
         * `actor.appliedEffects` (com fallback para `actor.effects` em versões antigas) e
         * aceitamos um efeito se ele tiver duração OU tiver `statuses`, restaurando o
         * comportamento antigo do V13.
         */
        getConditions(actor) {
            const source = actor.appliedEffects ?? actor.effects ?? [];
            const seen = new Set();
            const conditions = [];

            for (const effect of source) {
                if (!effect || effect.disabled || effect.active === false) continue;

                const hasStatus = effect.statuses instanceof Set
                    ? effect.statuses.size > 0
                    : Array.isArray(effect.statuses) && effect.statuses.length > 0;

                if (!effect.isTemporary && !hasStatus) continue;

                const src = effect.img;
                if (!src) continue;

                const id = effect.id || effect.name;
                if (id && seen.has(id)) continue;
                if (id) seen.add(id);

                conditions.push({
                    id: id || "unknown",
                    src,
                    name: effect.name || effect.label || "Unknown",
                    value: null
                });
            }

            return conditions;
        }

        /**
         * Checks if a stat can be rolled.
         * Required to avoid TemplateBuilder error.
         * NOTE: BaseSystemAdapter calls this as isStatRollable(path) (single argument).
         * We keep the actor parameter for forward-compatibility but only rely on `path`.
         *
         * Verifica se uma estatística pode ser rolada.
         * Necessário para evitar erro no TemplateBuilder.
         * OBS: O BaseSystemAdapter chama isto como isStatRollable(path) (um único argumento).
         * Mantemos o parâmetro actor por compatibilidade futura, mas só usamos `path`.
         */
        isStatRollable(actor, path) {
            return false;
        }

        /**
         * Executes a stat roll.
         * Fixes "hud.adapter.rollStat is not a function" error.
         *
         * Executa a rolagem de uma estatística.
         * Corrige o erro "hud.adapter.rollStat is not a function".
         */
        async rollStat(actor, path) {
            // Empty implementation to avoid crash when clicking Wounds/Fatigue.
            // Implementação vazia para evitar crash ao clicar em Ferimentos/Fadiga.
        }

        /**
         * Sidebar categories with translated and clean names.
         * Hides Powers/Magic for actors that have no power points pool at all
         * (e.g. a Vehicle), avoiding an empty/broken submenu.
         *
         * Categorias laterais com nomes traduzidos e limpos.
         * Esconde Poderes/Magia para atores que não possuem nenhum pool de
         * Power Points (ex: um Veículo), evitando um submenu vazio/quebrado.
         */
        getActionCategories(actor) {
            // Restructured categories inspired by D&D preset for better organization.
            // Categorias reestruturadas inspiradas no preset de D&D para melhor organização.
            const categories = [
                { id: "combat", label: "Combat", icon: "fa-solid fa-swords", type: "submenu" },
                { id: "skills", label: "Skills", icon: "fa-solid fa-list", type: "submenu" },
                { id: "magic", label: "Powers", icon: "fa-solid fa-wand-magic-sparkles", type: "submenu" },
                { id: "inventory", label: "Inventory", icon: "fa-solid fa-box-open", type: "submenu" },
                { id: "utility", label: "Utility", icon: "fa-solid fa-dice-d20", type: "submenu" }
            ];

            if (!actor?.system?.powerPoints) {
                return categories.filter((c) => c.id !== "magic");
            }

            return categories;
        }

        /**
         * Populates menus with actor items.
         * Preenche os menus com itens do ator.
         */
        async getSubMenuData(actor, categoryId) {
            switch (categoryId) {
                case "combat": return this._getCombatMenu(actor);
                case "skills": return this._getSkillsMenu(actor);
                case "magic": return this._getMagicMenu(actor);
                case "inventory": return this._getInventoryMenu(actor);
                case "utility": return this._getUtilityMenu(actor);
                default: return { title: "", items: [] };
            }
        }

        // Private methods to generate submenu data
        // Métodos privados para gerar dados de submenu

        _getCombatMenu(actor) {
            const weapons = actor.items.filter(i => i.type === 'weapon');
            // Robust filter: "Situational Rules" is the SWADE category label, but it
            // can be localized/renamed by future compendium updates. We accept the
            // legacy literal AND the localized value from CONFIG.SWADE, when available.
            // Filtro robusto: "Situational Rules" é o rótulo da categoria no SWADE, mas
            // pode ser localizado/renomeado em futuras atualizações do compêndio. Aceitamos
            // o literal antigo E o valor localizado vindo de CONFIG.SWADE, quando disponível.
            const situationalLabel = CONFIG.SWADE?.actionCategories?.situational
                ?? "Situational Rules";
            const actions = actor.items.filter(
                i => i.type === 'action' && (i.system?.category === situationalLabel || i.system?.category === 'Situational Rules'),
            );
            return {
                title: "Combat",
                hasTabs: true,
                items: {
                    weapons: weapons.map(i => ({ id: i.id, name: i.name, img: i.img })),
                    actions: actions.map(i => ({ id: i.id, name: i.name, img: i.img })),
                },
                tabLabels: { weapons: "Weapons", actions: "Maneuvers" }
            };
        }

        _getSkillsMenu(actor) {
            const skills = actor.items.filter(i => i.type === 'skill').sort((a, b) => a.name.localeCompare(b.name));
            const attributeKeys = Object.keys(actor.system?.attributes ?? {});
            const attributes = attributeKeys.map(k => ({
                id: k,
                name: this._cleanLabel(game.i18n.localize(`SWADE.Attr${k.charAt(0).toUpperCase() + k.slice(1)}`), true),
                img: "icons/svg/dice-target.svg"
            }));
            return {
                title: "Skills & Attributes",
                hasTabs: true,
                items: {
                    skills: skills.map(i => ({ id: i.id, name: i.name, img: i.img })),
                    attributes: attributes
                },
                tabLabels: { skills: "Skills", attributes: "Attributes" }
            };
        }

        _getMagicMenu(actor) {
            const powers = actor.items.filter(i => i.type === 'power');
            return {
                title: "Powers",
                items: powers.map(p => ({
                    id: p.id, name: p.name, img: p.img,
                    cost: p.system.pp ? `${p.system.pp} PP` : ""
                }))
            };
        }

        _getInventoryMenu(actor) {
            const consumables = actor.items.filter(i => i.type === 'consumable');
            const gear = actor.items.filter(i => i.type === 'gear');
            const armor = actor.items.filter(i => i.type === 'armor');
            const shield = actor.items.filter(i => i.type === 'shield');
            return {
                title: "Inventory",
                hasTabs: true,
                items: {
                    consumables: consumables.map(i => ({ id: i.id, name: i.name, img: i.img, uses: { value: i.system.charges?.charges?.[0]?.value, max: i.system.charges?.charges?.[0]?.max } })),
                    gear: gear.map(i => ({ id: i.id, name: i.name, img: i.img })),
                    armor: armor.map(i => ({ id: i.id, name: i.name, img: i.img })),
                    shield: shield.map(i => ({ id: i.id, name: i.name, img: i.img })),
                },
                tabLabels: { consumables: "Consumables", gear: "Gear", armor: "Armor", shield: "Shields" }
            };
        }

        _getUtilityMenu(actor) {
            const items = [
                { id: 'utility-benny', name: 'Spend Benny', img: 'icons/svg/coins.svg' },
                { id: 'utility-soak', name: 'Soak Damage', img: 'icons/svg/degen.svg' },
                { id: 'utility-unshake', name: 'Recover from Shaken', img: 'icons/svg/sun.svg' },
                { id: 'utility-run', name: 'Run', img: 'icons/svg/wingfoot.svg' }
            ];
            // Optional chaining all the way: Vehicles and some NPC variants don't have
            // `system.details` at all, which used to throw and break the whole submenu.
            // Optional chaining em toda a cadeia: Veículos e algumas variantes de NPC não
            // possuem `system.details`, o que antes lançava erro e quebrava o submenu todo.
            if ((actor.system?.details?.conviction?.value ?? 0) > 0) {
                items.push({ id: 'utility-conviction', name: 'Use Conviction', img: 'icons/svg/aura.svg' });
            }
            return { title: "Utility", items: items };
        }

        /**
         * Routes click to the corresponding action or item.
         * Roteia o clique para a ação ou item correspondente.
         */
        async useItem(actor, actionId, categoryId) {
            // Route for utility actions that are not items
            // Rota para ações de utilidade que não são itens
            if (actionId.startsWith('utility-')) {
                const action = actionId.replace('utility-', '');
                switch (action) {
                    case 'benny': return actor.spendBenny();
                    case 'soak':
                        if (typeof actor.rollSoak === 'function') {
                            return actor.rollSoak();
                        }

                        // Fallback: Execute Soak manually (Spend Benny + Roll Vigor)
                        // Fallback: Executa Soak manualmente (Gasta Benny + Rola Vigor)
                        if ((actor.system?.bennies?.value ?? 0) > 0) {
                            if (typeof actor.spendBenny === 'function') await actor.spendBenny();
                            else await actor.update({ "system.bennies.value": actor.system.bennies.value - 1 });

                            ChatMessage.create({ content: `${actor.name} attempts to Soak!`, speaker: ChatMessage.getSpeaker({ actor }) });

                            const soakRoll = await actor.rollAttribute('vigor');
                            if (soakRoll) {
                                const total = soakRoll.total;
                                if (total >= 4) {
                                    const woundsToHeal = 1 + Math.floor((total - 4) / 4);
                                    const currentWounds = actor.system?.wounds?.value ?? 0;
                                    if (currentWounds > 0) {
                                        const newWounds = Math.max(0, currentWounds - woundsToHeal);
                                        const healed = currentWounds - newWounds;
                                        await actor.update({ 'system.wounds.value': newWounds });
                                        ChatMessage.create({ content: `${actor.name} soaked ${healed} wound(s)!`, speaker: ChatMessage.getSpeaker({ actor }) });
                                    } else {
                                        ChatMessage.create({ content: `${actor.name} passed the soak roll!`, speaker: ChatMessage.getSpeaker({ actor }) });
                                    }
                                }
                            }
                            return;
                        } else {
                            ui.notifications.warn(game.i18n.localize("SWADE.NoBennies") || "No Bennies!");
                        }
                        return;
                    case 'unshake':
                        const unshakeRoll = await actor.rollAttribute('spirit');
                        if (unshakeRoll) {
                            const success = unshakeRoll.total >= 4;
                            let message = success ? `${actor.name} is no longer Shaken!` : `${actor.name} remains Shaken.`;

                            if (success) {
                                // Remove Shaken status.
                                // FOUNDRY V14 FIX: prefer `actor.appliedEffects` (the source the HUD
                                // itself now reads, see getConditions above) over the raw `actor.effects`
                                // collection, and guard `statuses` since it can be a Set, an Array, or
                                // missing entirely depending on the effect's origin.
                                //
                                // Remove o status Abalado (Shaken).
                                // CORREÇÃO FOUNDRY V14: preferimos `actor.appliedEffects` (a mesma fonte
                                // que o próprio HUD agora lê, ver getConditions acima) em vez da coleção
                                // crua `actor.effects`, e protegemos `statuses` pois ele pode ser um Set,
                                // um Array, ou nem existir, dependendo da origem do efeito.
                                const effectsSource = actor.appliedEffects ?? actor.effects ?? [];
                                const shaken = effectsSource.find((e) => {
                                    const statuses = e?.statuses;
                                    if (statuses instanceof Set) return statuses.has("shaken");
                                    if (Array.isArray(statuses)) return statuses.includes("shaken");
                                    return false;
                                });
                                if (shaken) await shaken.delete();
                            }
                            ChatMessage.create({ content: message, speaker: ChatMessage.getSpeaker({ actor }) });
                        }
                        return;
                    case 'run':
                        if (typeof actor.rollRunning === 'function') {
                            return actor.rollRunning();
                        }

                        // Fallback: Manual Running roll
                        // Fallback: Rolagem manual de Corrida
                        const runDie = actor.system?.pace?.running?.die || 6;
                        const runMod = actor.system?.pace?.running?.mod || 0;
                        let runFormula = `1d${runDie}`;
                        if (runMod !== 0) runFormula += runMod > 0 ? `+${runMod}` : `${runMod}`;

                        const runRoll = await new Roll(runFormula).evaluate();
                        return runRoll.toMessage({
                            speaker: ChatMessage.getSpeaker({ actor: actor }),
                            flavor: `${actor.name} runs!`
                        });
                    case 'conviction':
                        if ((actor.system?.details?.conviction?.value ?? 0) > 0) {
                            await actor.update({ 'system.details.conviction.value': actor.system.details.conviction.value - 1 });
                            ChatMessage.create({ content: `${actor.name} uses Conviction!`, speaker: ChatMessage.getSpeaker({ actor }) });
                        }
                        return;
                }
            }

            // Route for attribute rolls
            // Rota para rolagens de atributo
            if (Object.keys(actor.system?.attributes ?? {}).includes(actionId)) {
                return rollAttribute(actor, actionId);
            }

            // Route for item-based actions
            // Rota para ações baseadas em itens
            const item = actor.items.get(actionId);
            if (!item) return;

            switch (item.type) {
                case 'skill': return await rollSkill(actor, actionId);
                case 'weapon': return await rollCombat(actor, actionId);
                case 'power': return await rollPower(actor, actionId);
                case 'consumable': return await useConsumable(actor, actionId);
                default: return item.show();
            }
        }
    }

    // Registers the adapter with priority to override the default
    // Registra o adaptador com prioridade para sobrepor o padrão
    api.registerSystemAdapter("swade", SwadeIntegrationAdapter, { priority: 110, source: "swade-StylishActionHud-integration" });

    // Registers default attributes (Wounds, Fatigue, Bennies)
    // Registra atributos padrão (Vida, Fadiga, Bennies)
    api.registerDefaultAttributes("swade", [
        { path: "system.wounds", label: "SWADE.Wounds", color: "#e61c34", style: "bar" },
        { path: "system.fatigue", label: "SWADE.Fatigue", color: "#f39c12", style: "bar" },
        { path: "system.bennies", label: "SWADE.Bennies", color: "#2ecc71", style: "badge" },
        { path: "system.powerPoints.general", label: "SWADE.PowerPoints", color: "#3498db", style: "bar" },
        { path: "system.stats.parry.value", label: "SWADE.Parry", style: "number", color: "#95a5a6" },
        { path: "system.stats.toughness.value", label: "SWADE.Toughness", style: "number", color: "#7f8c8d" }
    ]);

    // Registers attribute suggestions for the settings menu
    // Registra sugestões de atributos para o menu de configurações
    api.registerTrackableAttributes("swade", (context) => {
        const attributes = [];
        if (context.actor?.system) {
            // Default Resources
            // Recursos Padrão
            attributes.push({ path: "system.wounds", label: "SWADE.Wounds", color: "#e61c34" });
            attributes.push({ path: "system.fatigue", label: "SWADE.Fatigue", color: "#f39c12" });
            attributes.push({ path: "system.bennies", label: "SWADE.Bennies", color: "#2ecc71", style: "badge" });

            // Power Points (Detects all available pools: general, magic, miracles, etc)
            // Power Points (Detecta todos os pools disponíveis: general, magic, miracles, etc)
            if (context.actor.system.powerPoints) {
                for (const [key, pool] of Object.entries(context.actor.system.powerPoints)) {
                    // Safety
                    // Segurança
                    if (typeof pool !== 'object') continue;

                    let label = "SWADE.PowerPoints";
                    if (key !== "general") {
                        label += ` (${key.charAt(0).toUpperCase() + key.slice(1)})`;
                    }
                    attributes.push({ path: `system.powerPoints.${key}`, label: label, color: "#3498db" });
                }
            }

            // Useful Derived Stats
            // Estatísticas Derivadas Úteis
            attributes.push({ path: "system.stats.parry.value", label: "SWADE.Parry", color: "#95a5a6", style: "number" });
            attributes.push({ path: "system.stats.toughness.value", label: "SWADE.Toughness", color: "#7f8c8d", style: "number" });
        }
        return attributes;
    });

    // FOUNDRY V14 / TIMING SAFEGUARD: the Stylish Action HUD module rebuilds its adapter
    // instance a second time on the "setup" hook, after broadcasting
    // "stylish-action-hud.registerSystemAdapters" to every other module. Registering here
    // as well costs nothing (registerSystemAdapter just appends an entry; this adapter's
    // priority of 110 still wins) and protects us if a future Foundry/module loading-order
    // change ever causes "apiReady" to fire after that broadcast instead of before it.
    //
    // SALVAGUARDA DE TIMING / FOUNDRY V14: o módulo Stylish Action HUD reconstrói sua
    // instância de adapter uma segunda vez no hook "setup", depois de disparar
    // "stylish-action-hud.registerSystemAdapters" para todos os outros módulos. Registrar
    // aqui também não tem custo (registerSystemAdapter apenas adiciona uma entrada; a
    // prioridade 110 deste adapter continua vencendo) e nos protege caso uma futura mudança
    // na ordem de carregamento do Foundry/módulos faça "apiReady" disparar depois desse
    // broadcast em vez de antes.
    Hooks.once("stylish-action-hud.registerSystemAdapters", (adapterRegistry) => {
        adapterRegistry.registerSystemAdapter("swade", SwadeIntegrationAdapter, {
            priority: 110,
            source: "swade-StylishActionHud-integration",
        });
    });

    console.log("SWADE HUD | Adapter finished and loaded.");
});
