/**
 * swade-StylishActionHud-powers.mjs
 * Logic for Arcane Powers using native SWADE Activities (v13+).
 *
 * Lógica para Poderes Arcanos usando as Atividades (Activities) nativas
 * do SWADE (v13+).
 *
 * NOTA: activity.roll() não aceita opções de UI — chamada sem argumentos.
 * O RollDialog abrirá normalmente como parte do fluxo do sistema.
 *
 * NOTE: activity.roll() does not accept UI options — call without arguments.
 * The RollDialog will open normally as part of the system flow.
 */

export async function rollPower(actor, itemId) {
    const item = actor.items.get(itemId);
    if (!item) return null;

    const activity = item.activities?.contents[0];

    // Se houver uma atividade definida (ex: ativação), rola; senão, apenas exibe no chat.
    // If an activity is defined (e.g. activation), roll it; otherwise, just display in chat.
    return activity ? activity.roll() : item.show();
}
