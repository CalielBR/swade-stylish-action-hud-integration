/**
 * swade-StylishActionHud-combat.mjs
 * Handles Weapons and Attack automation via Better Rolls 2 (BRSW).
 *
 * Lida com automação de Armas e Ataques via Better Rolls 2 (BRSW).
 */

export async function rollCombat(actor, itemId) {
    // 1. Check if Better Rolls 2 API is available
    // 1. Verifica se a API do Better Rolls 2 está disponível
    if (game.brsw) {
        try {
            // Create the item card and then trigger the automated roll
            // Cria o card do item e então aciona a rolagem automatizada
            return await game.brsw.create_item_card(actor, itemId).then((message) => {
                if (message && message.content) {
                    // Automates the click on the "Roll" button inside the generated card
                    // Automatiza o clique no botão "Roll" dentro do card gerado
                    game.brsw.roll_item(message, $(message.content), false);
                }
            });
        } catch (err) {
            console.error("SWADE HUD Integration | Combat Roll Failed", err);
        }
    }

    // 2. Fallback: Use SWADE V13 Activities if BRSW is unavailable
    // 2. Fallback: Usa Atividades do SWADE V13 se o BRSW estiver indisponível
    const item = actor.items.get(itemId);
    if (!item) return;

    const activity = item.activities?.contents[0];

    // If there's an activity (like an attack), roll it; otherwise, just show the item card.
    // Se houver uma atividade (como um ataque), rola ela; caso contrário, apenas mostra o card do item.
    return activity
        ? activity.roll({ renderSheet: false })
        : item.show();
}