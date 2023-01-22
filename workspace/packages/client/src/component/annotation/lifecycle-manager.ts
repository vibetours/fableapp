import HighlighterBase from '../base/hightligher-base';

export default class AnnotationLifecycleManager extends HighlighterBase {
  private annotationElMap: Record<string, any>;

  // Take the initial annotation config from here
  constructor(doc: Document) {
    super(doc);
    this.annotationElMap = {};
  }

  showAnnotation(el: HTMLElement) {

  }

  public dispose(): void {
    super.dispose();
  }
}
