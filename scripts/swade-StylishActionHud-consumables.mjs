/**
 * swade-StylishActionHud-consumables.mjs
 * Handles the usage of Consumables and Inventory Items via SWADE v13 Activities.
 *
 * Lida com o uso de Consumíveis e Itens de Inventário via Atividades do SWADE v13.
 */

export async function useConsumable(actor, itemId) {
    const item = actor.items.get(itemId);
    if (!item) return;

    // Automation: Prioritize the first Activity (Usage, Healing, or Resource consumption)
    // Automação: Prioriza a primeira Atividade (Uso, Cura ou consumo de Recurso)
    const activity = item.activities?.contents[0];

    if (activity) {
        // roll() in v13 handles resource deduction and chat card generation
        // roll() na v13 lida com dedução de recursos e geração de card no chat
        return await activity.roll({
            renderSheet: false,
            skipDialog: true
        });
    }

    // Fallback: If no activity is defined, just display the item card in chat
    // Fallback: Se nenhuma atividade for definida, apenas exibe o card do item no chat
    return await item.show();
}