import { P_RespTour } from '../../entity-processor';
import { IDemoHubConfig, IDemoHubConfigCta } from '../../types';

export const getTourByRid = (allTours: P_RespTour[], rid: string): P_RespTour | undefined => {
  const res = allTours.find(tour => tour.rid === rid);
  return res;
};

export const getCtaById = (
  demoHubConfig: IDemoHubConfig,
  ctaId: string
): IDemoHubConfigCta | undefined => {
  const res = demoHubConfig.cta.find(cta => cta.id === ctaId);
  return res;
};

export const getEntryTypeTitle = (type: 'single-select' | 'multi-select' | 'text-entry' | 'leadform-entry'): string => {
  switch (type) {
    case 'leadform-entry':
      return 'Leadform entry';
    case 'multi-select':
      return 'Multiselect entry';
    case 'single-select':
      return 'Single entry';
    case 'text-entry':
      return 'Text entry';
    default:
      return '';
  }
};

export function stringToSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
