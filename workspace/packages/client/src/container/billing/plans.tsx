export interface IPriceDetails {
  id: number;
  planName: string;
  planId: 'pro' | 'business' | 'enterprise';
  priceAnnual?: number;
  priceMonthly?: number;
  featTitle: string;
  featList: Array<{ id: number; feat: string; isHightlighted: boolean }>;
  buttonText?: string;
  buttonLink?: string;
}

export const PriceDetailsData: Array<IPriceDetails> = [
  {
    id: 1,
    planName: 'Pro',
    planId: 'pro',
    priceAnnual: 99,
    priceMonthly: 125,
    featTitle: 'Whats included?',
    featList: [
      { id: 1.1, feat: 'Unlimited interactive demos', isHightlighted: false },
      { id: 1.2, feat: 'Unlimited demo views', isHightlighted: false },
      { id: 1.3, feat: 'No min licenses', isHightlighted: true },
      { id: 1.4, feat: 'Figma screen support', isHightlighted: true },
      { id: 1.5, feat: 'Lead forms', isHightlighted: false },
      { id: 1.6, feat: 'Auto-stitch of demo flows', isHightlighted: true },
      { id: 1.7, feat: 'Enable hotspot', isHightlighted: false },
      { id: 1.8, feat: 'Analytics', isHightlighted: false },
      { id: 1.9, feat: 'Custom branding', isHightlighted: false },
      { id: 1.11, feat: 'Record HTML application', isHightlighted: false },
      { id: 1.12, feat: 'Multi-flow demos & demo index', isHightlighted: false },
      { id: 1.13, feat: 'Add text, images, GIFs to annotations', isHightlighted: false },
      { id: 1.14, feat: 'Demo editor', isHightlighted: false },
      { id: 1.15, feat: 'Personalize demos', isHightlighted: false },
    ],
  },
  {
    id: 2,
    planName: 'Business',
    planId: 'business',
    priceAnnual: 119,
    priceMonthly: 150,
    featTitle: 'Everything in Pro +',
    featList: [
      { id: 2.1, feat: 'Advanced demo analytics', isHightlighted: false },
      { id: 2.2, feat: 'Advanced branching demo', isHightlighted: true },
      { id: 2.3, feat: 'Enable demo automation', isHightlighted: true },
      { id: 2.4, feat: 'Add video annotations', isHightlighted: false },
      { id: 2.5, feat: 'Create demo templates', isHightlighted: false },
      { id: 2.6, feat: 'Zapier integration', isHightlighted: false },
      { id: 2.7, feat: 'HubSpot integration', isHightlighted: false },
      { id: 2.8, feat: 'SalesForce integration', isHightlighted: false },
      { id: 2.9, feat: 'Segment integration', isHightlighted: false },
      { id: 2.11, feat: 'Dedicated support', isHightlighted: false },
      { id: 2.12, feat: 'Multi-team functionality', isHightlighted: false },
    ],
  },
  {
    id: 3,
    planName: 'Enterprise',
    planId: 'enterprise',
    featTitle: 'Everything in Business +',
    featList: [
      { id: 3.1, feat: 'For > 10 users', isHightlighted: false },
      { id: 3.2, feat: 'Custom pricing', isHightlighted: false },
      { id: 3.3, feat: 'SSO', isHightlighted: true },
      { id: 3.4, feat: 'Dedicated slack support', isHightlighted: false },
      { id: 3.5, feat: 'Demo coaching', isHightlighted: false },
      { id: 3.6, feat: 'Custom APIs', isHightlighted: false },
      { id: 3.7, feat: 'Dedicated CSM', isHightlighted: false },
      { id: 3.8, feat: 'Custom integrations', isHightlighted: false },
    ],
    buttonText: 'Contact Sales',
    buttonLink: 'mailto:vikas@sharefable.com?subject=Enterprise%20plan%20of%20Fable'
  },
];
