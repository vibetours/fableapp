export class DOMElementSelection {
  currentEl: HTMLElement | null = null;

  lastEl: HTMLElement | null = null;

  clear = () => {
    this.currentEl = null;
    this.lastEl = null;
  };

  from(that: DOMElementSelection) {
    this.currentEl = that.currentEl;
    this.lastEl = that.currentEl;
  }
}

export enum SelectionRegistryType {
  // When mouse is hovered to see outline of dom elements. This happens when edit button is clicked
  // and an item is not pinned
  PROBING = 'PROBING',
}

export const SELECTION_REGISTRY: Record<SelectionRegistryType, DOMElementSelection> = {
  [SelectionRegistryType.PROBING]: new DOMElementSelection(),
};
