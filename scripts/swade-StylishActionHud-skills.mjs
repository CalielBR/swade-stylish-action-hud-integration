/**
 * swade-StylishActionHud-skills.mjs
 * Handles Skill rolls automation via Better Rolls 2 (BRSW).
 *
 * Lida com automação de rolagens de Perícia via Better Rolls 2 (BRSW).
 */

export async function rollSkill(actor, skillId) {
    // 1. Automação via Better Rolls 2
    // 1. Automation via Better Rolls 2
    if (game.brsw) {
        try {
            return await game.brsw.create_skill_card(actor, skillId).then((message) => {
                // Executa a rolagem automática (Wild Die + Aces) baseada no card criado
                // Executes automatic roll (Wild Die + Aces) based on the created card
                game.brsw.roll_skill(message, false);
            });
        } catch (err) {
            console.error("SWADE HUD Integration | Skill Roll Failed", err);
        }
    }

    // 2. Fallback: Se o BRSW estiver desativado, usa o método padrão do sistema
    // 2. Fallback: If BRSW is disabled, use the system's default method
    const skill = actor.items.get(skillId);
    if (!skill) return;

    return actor.rollItem(skillId, { renderSheet: false });
}