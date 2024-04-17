import { traceEvent } from '@fable/common/dist/amplitude';
import { CmnEvtProp } from '@fable/common/dist/types';
import { AMPLITUDE_EVENTS } from './events';
import { SiteData } from '../types';

export const enum propertyCreatedFromWithType {
  CANVAS_PLUS_ICON_COVER_NEW_SCREEN = 'canvas_plus_icon_cover_new_screen',
  CANVAS_PLUS_ICON_COVER_SAME_SCREEN = 'canvas_plus_icon_cover_same_screen',
  TIMELINE_PLUS_ICON_COVER_SAME_SCREEN = 'timeline_plus_icon_cover_same_screen',
  TIMELINE_PLUS_ICON_COVER_NEW_SCREEN = 'timeline_plus_icon_cover_new_screen',
  DOM_EL_PICKER = 'dom_el_picker',
  IMG_DRAG_RECT = 'img_drag_rect',
  COVER_ANN_BTN = 'cover_ann_btn'
}

export const amplitudeAddScreensToTour = (
  newScreensLength: number,
  from: 'ext' | 'app'
): void => {
  traceEvent(AMPLITUDE_EVENTS.ADD_SCREENS_TO_TOUR, {
    num_screens_added: newScreensLength,
    from
  }, [CmnEvtProp.TOUR_URL, CmnEvtProp.EMAIL]);
};

export const amplitudeNewAnnotationCreated = (
  createdFromWithType: propertyCreatedFromWithType,
): void => {
  traceEvent(AMPLITUDE_EVENTS.NEW_ANNOTATION_CREATED, {
    created_from_with_type: createdFromWithType,
  }, [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]);
};

export const amplitudeScreenEdited = (
  editedProp: 'text' | 'show_or_hide_el' | 'blur_el' | 'mask_el' | 'replace_image',
  editedPropValue: string | boolean
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.SCREEN_EDITED,
    { edited_prop: editedProp, edited_prop_value: editedPropValue },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeAnnotationEdited = (
  annotationProp: 'text' | 'box_sizing' | 'branding-primary_color' | 'branding-background_color' |
    'branding-selection_shape' | 'branding-border_color' |
    'branding-font_color' | 'branding-selection_color' | 'branding-font_family' | 'branding-button_layout' |
    'branding-padding' | 'branding-border_radius' | 'add_new_cta' | 'cta-button_style' | 'cta-button_size' |
    'cta-button_text' | 'hide_cta' | 'add_link_to_cta' | 'hotspot-interactive_element' | 'hotspot-hide_annotation' |
    'hotspot-nested_element' | 'entry_point' | 'overlay',
  annotationPropValue: string | number | boolean
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.ANNOTATION_EDITED,
    { annotation_prop: annotationProp, annotation_prop_value: annotationPropValue },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeAnnotationApplyAll = (
  applyTo: 'module' | 'all',
  annotationProp: 'branding-selection_color' | 'branding-selection_shape' | 'cta-button_size' | 'overlay'
    | 'branding-selection_effect',
  annotationPropValue: string | number | boolean
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.ANNOTATION_APPLY_ALL,
    { apply_to: applyTo, annotation_prop: annotationProp, annotation_prop_value: annotationPropValue },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeShareModalOpen = (
  shareModalClickedFrom: 'tours' | 'editor' | 'preview'
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.ANNOTATION_APPLY_ALL,
    { share_modal_clicked_from: shareModalClickedFrom },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeCtaConfigChanged = (
  ctaConfigName: keyof SiteData,
  ctaConfigValue: string
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.CTA_LINK_SITE_CONFIG_CHANGED,
    { cta_config_name: ctaConfigName, cta_config_value: ctaConfigValue },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};

export const amplitudeRemoveWatermark = (
  from: 'sharemodal' | 'acp'
): void => {
  traceEvent(
    AMPLITUDE_EVENTS.REMOVE_WATERMARK,
    { remove_watermark_from: from },
    [CmnEvtProp.EMAIL, CmnEvtProp.TOUR_URL]
  );
};
