export const CHARACTERS = [
  { id: 'cat', name: '고양이', weapon: 'shard', weaponName: '털실 뭉치', sheet: 'asset:cat:sheet' },
  { id: 'dog', name: '강아지', weapon: 'aura', weaponName: '펄스', sheet: 'asset:dog:sheet' },
] as const;

export type CharacterId = (typeof CHARACTERS)[number]['id'];

export let selectedCharacter: (typeof CHARACTERS)[number] = CHARACTERS[0];

export function selectCharacter(id: CharacterId) {
  selectedCharacter = CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
}
