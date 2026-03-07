/**
 * swade-StylishActionHud-powers.mjs
 * Logic for Arcane Powers via Better Rolls 2 (BRSW)
 *
 * Lógica para Poderes Arcanos via Better Rolls 2 (BRSW)
 */

export async function rollPower(actor, itemId) {
    // 1. Automation via Better Rolls 2
    // 1. Automação via Better Rolls 2
    if (game.brsw) {
        try {
            // BRSW creates the power card and automatically executes the arcane skill roll
            // O BRSW cria o card de poder e executa a rolagem de perícia arcana automaticamente
            return await game.brsw.create_item_card(actor, itemId).then((message) => {
                if (message && message.content) {
                    // Simulates automatic click to process power activation
                    // Simula o clique automático para processar a ativação do poder
                    game.brsw.roll_item(message, $(message.content), false);
                }
            });
        } catch (err) {
            console.error("SWADE HUD Integration | Power Activation Failed", err);
        }
    }

    // 2. Fallback to SWADE V13 Activities (if BRSW fails or is disabled)
    // 2. Fallback para SWADE V13 Activities (caso o BRSW falhe ou esteja desativado)
    const item = actor.items.get(itemId);
    if (!item) return;

    const activity = item.activities?.contents[0];

    // If an activity is defined (e.g. activation), roll it; otherwise, just show in chat
    // Se houver uma atividade definida (ex: ativação), rola; senão, apenas exibe no chat
    return activity
        ? activity.roll({ renderSheet: false })
        : item.show();
}