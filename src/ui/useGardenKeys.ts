import { useEffect } from 'react';
import { useGarden } from '../store/garden';

const typing = (el: Element | null) =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement).isContentEditable);

/**
 * Garden keys (design system PlantField / Overlay):
 *   N    → plant: open the planting field
 *   Esc  → close settings or the reveal, put down the planting field, or close an open memory
 * Tab moves through the flowers (FlowerTargets); ` opens the hidden time slider (TimeSlider).
 */
export function useGardenKeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const active = document.activeElement;
      if ((e.key === 'n' || e.key === 'N') && !typing(active)) {
        const { planting, openPlanting, phase, settings, episode } = useGarden.getState();
        // In the episode, N offers the two fragments first (and "write a memory" from there).
        if (phase === 'garden' && planting === 'closed' && !settings) { e.preventDefault(); openPlanting(episode ? 'kind' : 'field'); }
        return;
      }
      if (e.key === 'Escape') {
        const { focusedId, focus, planting, closePlanting, reveal, closeReveal, settings, closeSettings } = useGarden.getState();
        if (settings) {
          closeSettings();
          document.querySelector<HTMLButtonElement>('.settings-entry')?.focus();
        } else if (reveal.open) {
          closeReveal();
          document.querySelector<HTMLButtonElement>('.reveal-entry')?.focus();
        } else if (planting !== 'closed') {
          closePlanting();
          document.querySelector<HTMLButtonElement>('.plant-button')?.focus();
        } else if (focusedId) {
          focus(null);
          // Return keyboard focus to the flower that was open, so Tab carries on from there.
          document.querySelector<HTMLButtonElement>(`.flower-target[data-id="${CSS.escape(focusedId)}"]`)?.focus();
        } else if (typing(active)) {
          (active as HTMLElement).blur();
        }
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
}
