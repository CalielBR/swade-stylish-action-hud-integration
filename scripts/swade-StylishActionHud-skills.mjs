/**
 * swade-StylishActionHud-skills.mjs
 * Handles Skill rolls using the native SWADE API (actor.rollSkill).
 *
 * Lida com rolagens de Perícia usando a API nativa do SWADE (actor.rollSkill).
 *
 * NOTA: activity.roll() não aceita opções de UI como renderSheet/skipDialog.
 * O RollDialog é obrigatório no fluxo do sistema — o diálogo abrirá normalmente.
 *
 * NOTE: activity.roll() does not accept UI options like renderSheet/skipDialog.
 * The RollDialog is mandatory in the system's flow — the dialog will open normally.
 */

export async function rollSkill(actor, skillId) {
    const skill = actor.items.get(skillId);
    if (!skill) return null;

    // Caminho principal: actor.rollSkill() é a API canônica confirmada pelo código-fonte.
    // Ela aceita o skillId diretamente e gerencia unskilled attempts, modificadores, etc.
    //
    // Primary path: actor.rollSkill() is the canonical API confirmed via source code.
    // It accepts the skillId directly and handles unskilled attempts, modifiers, etc.
    if (typeof actor.rollSkill === "function") {
        return actor.rollSkill(skillId);
    }

    // Fallback: se rollSkill não existir (improvável), tenta via Activity do item.
    // Fallback: if rollSkill doesn't exist (unlikely), try via the item's Activity.
    console.warn(`SWADE HUD | actor.rollSkill não disponível para ${actor.name}. Usando Activity como fallback.`);
    const activity = skill.activities?.contents[0];
    return activity ? activity.roll() : skill.show();
}
