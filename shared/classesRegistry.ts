import { AbilityDefinition, ClassDefinition, ClassId } from './types';
import { SOLARI_CLASSES } from './classes/solariClasses';
import { TERRA_CLASSES } from './classes/terraClasses';
import { UMBRI_CLASSES } from './classes/umbriClasses';
import { AETHER_CLASSES } from './classes/aetherClasses';

export const CLASSES_REGISTRY: Record<ClassId, ClassDefinition> = {
  ...SOLARI_CLASSES,
  ...TERRA_CLASSES,
  ...UMBRI_CLASSES,
  ...AETHER_CLASSES,
} as Record<ClassId, ClassDefinition>;

export const ALL_ABILITIES: Record<string, AbilityDefinition> = {};
for (const cls of Object.values(CLASSES_REGISTRY)) {
  for (const ability of cls.abilities) {
    ALL_ABILITIES[ability.id] = ability;
  }
}
