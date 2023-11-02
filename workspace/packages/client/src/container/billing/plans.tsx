export interface IPriceDetails {
  id: number;
  planName: string;
  planId: 'startup' | 'business' | 'enterprise';
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
    planName: 'Startup',
    planId: 'startup',
    priceAnnual: 100,
    priceMonthly: 125,
    featTitle: "What's included?",
    featList: [
      { id: 1.1, feat: '1 user', isHightlighted: false },
      { id: 1.2, feat: 'Unlimited interactive demos', isHightlighted: false },
      { id: 1.3, feat: 'Unlimited demo views', isHightlighted: false },
      { id: 1.4, feat: 'Basic demo analytics', isHightlighted: true },
      { id: 1.5, feat: 'Record HTML application', isHightlighted: false },
      { id: 1.6, feat: 'Auto-stitch of demo flows', isHightlighted: true },
      { id: 1.7, feat: 'Demo editor', isHightlighted: false },
      { id: 1.8, feat: 'Multi-flow demos', isHightlighted: false },
      { id: 1.9, feat: 'Custom branding', isHightlighted: false },
      { id: 1.11, feat: 'Enable hotspot', isHightlighted: false },
      { id: 1.12, feat: 'Personalize demos', isHightlighted: false },
    ],
  },
  {
    id: 2,
    planName: 'Business',
    planId: 'business',
    priceAnnual: 500,
    priceMonthly: 625,
    featTitle: 'Everything in Startup +',
    featList: [
      { id: 2.1, feat: 'Upto 10 users', isHightlighted: false },
      { id: 2.2, feat: 'Advanced demo analytics', isHightlighted: true },
      { id: 2.3, feat: 'Custom lead forms', isHightlighted: true },
      { id: 2.4, feat: 'Figma screen support', isHightlighted: false },
      { id: 2.5, feat: 'Advanced branching demo', isHightlighted: false },
      { id: 2.6, feat: 'Video guides', isHightlighted: false },
      { id: 2.7, feat: 'Demo templates', isHightlighted: false },
      { id: 2.8, feat: 'SalesForce integration', isHightlighted: false },
      { id: 2.9, feat: 'HubSpot integration', isHightlighted: false },
      { id: 2.11, feat: 'Marketo integration', isHightlighted: false },
      { id: 2.12, feat: 'Pardot integration', isHightlighted: false },
      { id: 2.13, feat: 'Segment integration', isHightlighted: false },
      { id: 2.14, feat: 'Zapier integration', isHightlighted: false },
      { id: 2.15, feat: 'Dedicated support', isHightlighted: false },
    ],
  },
  {
    id: 3,
    planName: 'Enterprise',
    planId: 'enterprise',
    featTitle: 'Everything in Business +',
    featList: [
      { id: 3.1, feat: 'For > 10 users', isHightlighted: false },
      { id: 3.2, feat: 'Multi-team', isHightlighted: false },
      { id: 3.3, feat: 'Custom pricing', isHightlighted: false },
      { id: 3.4, feat: 'SSO', isHightlighted: true },
      { id: 3.5, feat: 'Dedicated slack support', isHightlighted: false },
      { id: 3.6, feat: 'Demo coaching', isHightlighted: false },
      { id: 3.7, feat: 'Quarterly demo reviews', isHightlighted: false },
      { id: 3.8, feat: 'Custom APIs', isHightlighted: false },
      { id: 3.9, feat: 'Dedicated CSM', isHightlighted: false },
      { id: 3.11, feat: 'Custom integrations', isHightlighted: false },
    ],
    buttonText: 'Contact Sales',
    buttonLink: 'mailto:vikas@sharefable.com?subject=Enterprise%20plan%20of%20Fable'
  },
];
