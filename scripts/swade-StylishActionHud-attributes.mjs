/**
 * swade-StylishActionHud-attributes.mjs
 * Lógica de rolagens de Atributos usando exclusivamente a API nativa do SWADE.
 * Normaliza o ID do atributo (ex: 'Agility'/'AGILITY' -> 'agility').
 *
 * Logic for Attribute rolls using exclusively the native SWADE API.
 * Normalizes the attribute ID (e.g. 'Agility'/'AGILITY' -> 'agility').
 *
 * NOTA: actor.rollAttribute() não aceita opções extras — a assinatura real é
 * rollAttribute(key) sem segundo argumento. O RollDialog abrirá normalmente.
 *
 * NOTE: actor.rollAttribute() does not accept extra options — the real signature is
 * rollAttribute(key) with no second argument. The RollDialog will open normally.
 */

export async function rollAttribute(actor, attributeKey) {
  // Normalização: Garante que 'Agility' ou 'AGILITY' vire 'agility'
  // Normalization: Ensures 'Agility' or 'AGILITY' becomes 'agility'
  const key = attributeKey.toLowerCase();

  console.log(`SWADE HUD | A rolar Atributo: ${key} para ${actor.name}`);

  if (typeof actor.rollAttribute !== "function") {
    console.warn(`SWADE HUD | actor.rollAttribute não está disponível para ${actor.name}.`);
    return null;
  }

  return await actor.rollAttribute(key);
}
