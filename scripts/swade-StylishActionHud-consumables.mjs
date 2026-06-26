/**
 * swade-StylishActionHud-consumables.mjs
 * Handles the usage of Consumables and Inventory Items via SWADE Activities (v13+).
 *
 * Lida com o uso de Consumíveis e Itens de Inventário via Atividades do SWADE (v13+).
 *
 * NOTA: activity.roll() não aceita opções de UI como renderSheet ou skipDialog.
 * Essas opções eram inválidas e foram removidas. O diálogo (RollDialog) faz parte
 * obrigatória do fluxo — não é possível pulá-lo programaticamente nesta versão do sistema.
 *
 * NOTE: activity.roll() does not accept UI options like renderSheet or skipDialog.
 * Those options were invalid and have been removed. The RollDialog is a mandatory
 * part of the flow — it cannot be skipped programmatically in this version of the system.
 */

export async function useConsumable(actor, itemId) {
    const item = actor.items.get(itemId);
    if (!item) return;

    // Automação: Prioriza a primeira Atividade (Uso, Cura ou consumo de Recurso)
    // Automation: Prioritize the first Activity (Usage, Healing, or Resource consumption)
    const activity = item.activities?.contents[0];

    if (activity) {
        try {
            // roll() lida com dedução de recursos e geração de card no chat
            // roll() handles resource deduction and chat card generation
            return await activity.roll();
        } catch (err) {
            // Se a Activity roll falhar (ex: sem cargas restantes), recorremos a
            // apenas exibir o card do item, em vez de deixar o clique no HUD sem resposta.
            //
            // If the Activity roll fails (e.g. not enough charges left), fall back to
            // just showing the item card instead of leaving the HUD click unresponsive.
            console.warn("SWADE HUD Integration | Falha ao executar Activity do consumível, a mostrar card.", err);
            return await item.show();
        }
    }

    // Fallback: Se nenhuma atividade for definida, apenas exibe o card do item no chat
    // Fallback: If no activity is defined, just display the item card in chat
    return await item.show();
}
