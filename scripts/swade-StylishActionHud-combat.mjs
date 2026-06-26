/**
 * swade-StylishActionHud-combat.mjs
 * Handles Weapons and Attack rolls using native SWADE Activities (v13+).
 *
 * Lida com Armas e rolagens de Ataque usando as Atividades (Activities)
 * nativas do SWADE (v13+).
 *
 * NOTA: activity.roll() não aceita opções de UI — chamada sem argumentos.
 * O RollDialog abrirá normalmente como parte do fluxo do sistema.
 *
 * NOTE: activity.roll() does not accept UI options — call without arguments.
 * The RollDialog will open normally as part of the system flow.
 */

export async function rollCombat(actor, itemId) {
    const item = actor.items.get(itemId);
    if (!item) return null;

    const activity = item.activities?.contents[0];

    // Se houver uma atividade (como um ataque), rola ela; caso contrário, apenas mostra o card do item.
    // If there's an activity (like an attack), roll it; otherwise, just show the item card.
    return activity ? activity.roll() : item.show();
}
