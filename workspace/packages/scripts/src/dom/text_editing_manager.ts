import { restoreSavedProperty, saveCurrentProperty } from './utils';

/*
 * root is the node containing the naked text node or a node containing only the text node
 */
export default class TextEditingManager {
  private readonly txt: Text;

  private readonly doc: Document;

  private readonly txtCon: HTMLElement;

  private readonly txtParent: HTMLElement;

  private readonly btnInPath: HTMLButtonElement | null = null;

  constructor(txt: Text, event: MouseEvent, doc: Document) {
    this.txt = txt;
    this.doc = doc;

    this.txtParent = this.txt.parentElement as HTMLElement;
    let node = this.txtParent;
    while (!((node instanceof HTMLBodyElement) || (node.tagName && node.tagName.toLowerCase() === 'body'))) {
      if (node instanceof HTMLButtonElement) {
        this.btnInPath = node;
      }
      node = node.parentElement as HTMLElement;
    }

    if (!this.btnInPath && this.txtParent.childNodes.length === 1) {
      // Buttons are treated differently as pressing space triggers button submit
      // also <space> does not work inside button
      this.txtCon = this.txtParent;
    } else {
      // Parent contains child node along with other nodes, we have to wrap it up with a span
      const con = this.doc.createElement('span');
      // A 1px left right border is given so that the cursor does not overlap with the border
      con.style.padding = '0px 1px';
      con.style.margin = '0px';
      con.style.top = 'auto';
      const clonedTxt = this.txt.cloneNode();
      con.appendChild(clonedTxt);
      this.txt.replaceWith(con);
      this.txt = clonedTxt as Text;
      this.txtCon = con;
    }
  }

  start() {
    this.markTextEls();
    this.focusAndSetCursor(this.txtCon);
  }

  finish() {
    this.restoreTextNodes();
  }

  private focusAndSetCursor(el: HTMLElement) {
    el.setAttribute('contenteditable', 'true');
    el.focus();
    const selection = getSelection();
    // el -> must have only one child that is text
    selection?.setPosition(el.childNodes[0], el.innerText.length);
  }

  private doesTxtHaveGuardCon() {
    // If the text parent is not same as text container => naked text node was guarded with span
    return this.txtParent !== this.txtCon;
  }

  private restoreTextNodes() {
    if (this.doesTxtHaveGuardCon()) {
      this.txtCon.replaceWith(this.txt);
      this.btnInPath && this.btnInPath.removeAttribute('disabled');
    } else {
      restoreSavedProperty(this.txtCon, 'style.background');
      restoreSavedProperty(this.txtCon, 'style.outline');
      restoreSavedProperty(this.txtCon, 'style.boxShadow');
    }
  }

  private markTextEls() {
    saveCurrentProperty(this.txtCon, 'style.background', null);
    saveCurrentProperty(this.txtCon, 'style.outline', null);
    saveCurrentProperty(this.txtCon, 'style.boxShadow', null);
    // When editing a button we disable the button first so that action gets triggered when
    // <space> or <enter> is pressed. The underlying span is contenteditable and focused
    // so the event reaches there
    this.btnInPath && this.btnInPath.setAttribute('disabled', 'true');
    this.txtCon.style.background = '#fee26f';
    this.txtCon.style.outline = 'none';
    this.txtCon.style.boxShadow = '0px 0px 0px 2px #150345';
  }
}
