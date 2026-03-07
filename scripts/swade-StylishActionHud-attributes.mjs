/**
 * swade-StylishActionHud-attributes.mjs
 * Lógica de rolagens de Atributos via Better Rolls 2 (BRSW).
 * Normaliza IDs e corrige o erro de digitação interno do módulo original.
 *
 * Logic for Attribute rolls via Better Rolls 2 (BRSW).
 * Normalizes IDs and fixes internal typo in the original module.
 */

export async function rollAttribute(actor, attributeKey) {
  // 1. Normalização: Garante que 'Agility' ou 'AGILITY' vire 'agility'
  // 1. Normalization: Ensures 'Agility' or 'AGILITY' becomes 'agility'
  const key = attributeKey.toLowerCase();

  console.log(`SWADE HUD | A iniciar rolagem de Atributo: ${key} para ${actor.name}`);

  // 2. Acesso à API do Better Rolls 2
  // 2. Access Better Rolls 2 API
  const brsw = game.brsw;

  if (brsw) {
    try {
      /** * O autor do BRSW registrou a função com um erro: 'create_atribute_card'.
       * Verificamos ambos os nomes para garantir compatibilidade e automação.
       *
       * The BRSW author registered the function with a typo: 'create_atribute_card'.
       * We check both names to ensure compatibility and automation.
       */
      const createFunc = brsw.create_atribute_card || brsw.create_attribute_card;

      if (typeof createFunc === "function") {
        // Cria o Card de Atributo (objeto ChatMessage)
        // Create Attribute Card (ChatMessage object)
        const message = await createFunc(actor, key);

        if (message && brsw.roll_attribute) {
          /**
           * Executa a rolagem imediata.
           * O parâmetro 'false' evita que o BRSW abra o diálogo de modificadores/bennies.
           * Isso aciona a classe TraitRoll para calcular explosões e fumbles.
           *
           * Executes immediate roll.
           * The 'false' parameter prevents BRSW from opening the modifier/benny dialog.
           * This triggers the TraitRoll class to calculate explosions and fumbles.
           */
          return await brsw.roll_attribute(message, false);
        }
      } else {
        console.warn("SWADE HUD | Funções de criação de card não encontradas no BRSW.");
      }
    } catch (err) {
      console.error("SWADE HUD | Erro na integração BRSW de Atributos:", err);
    }
  }

  // 3. FALLBACK: Se o Better Rolls falhar, utiliza o sistema nativo do SWADE
  // Garante que o clique no HUD nunca fique sem resposta.
  //
  // 3. FALLBACK: If Better Rolls fails, use native SWADE system
  // Ensures HUD click never goes unresponsive.
  if (typeof actor.rollAttribute === "function") {
    console.log("SWADE HUD | BRSW indisponível. A usar fallback nativo.");
    return await actor.rollAttribute(key, { renderSheet: false });
  }
}