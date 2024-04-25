export interface IPriceDetails {
  id: number;
  planName: string;
  planId: 'solo' | 'startup' | 'business' | 'enterprise' | 'lifetime';
  priceAnnual?: number;
  priceMonthly?: number;
  priceLifetime?: number;
  featTitle: string;
  featList: Array<{ id: number; feat: string; isHightlighted: boolean }>;
  buttonText?: string;
  buttonLink?: string;
}

export const PriceDetailsData: Array<IPriceDetails> = [
  {
    id: 1,
    planName: 'Solo',
    planId: 'solo',
    priceAnnual: 0,
    priceMonthly: 0,
    featTitle: "What's included?",
    featList: [
      { id: 1.1, feat: 'Full html capture + edit', isHightlighted: true },
      { id: 1.2, feat: '1 published demo', isHightlighted: false },
      { id: 1.3, feat: 'Unlimited demo views', isHightlighted: false },
      { id: 1.4, feat: '1 creator', isHightlighted: true },
      { id: 1.5, feat: 'Unlimited views and viewers', isHightlighted: false },
      { id: 1.6, feat: 'Share as link or embed', isHightlighted: true },
      { id: 1.7, feat: 'Auto-stitch of demos', isHightlighted: false },
      { id: 1.8, feat: 'Basic Analytics', isHightlighted: false },
    ],
  },
  {
    id: 2,
    planName: 'Startup',
    planId: 'startup',
    priceAnnual: 40,
    priceMonthly: 50,
    featTitle: 'Everything in Solo +',
    featList: [
      { id: 1.2, feat: 'Unlimited demos', isHightlighted: false },
      { id: 1.6, feat: 'Auto-stitch of demo flows', isHightlighted: true },
      { id: 1.3, feat: 'Multi-flow demos with modules', isHightlighted: false },
      { id: 1.4, feat: 'Figma support', isHightlighted: true },
      { id: 1.5, feat: 'Custom webhooks', isHightlighted: false },
      { id: 1.7, feat: 'Call-to-action buttons', isHightlighted: false }
    ],
  },
  {
    id: 3,
    planName: 'Business',
    planId: 'business',
    priceAnnual: 100,
    priceMonthly: 125,
    featTitle: 'Everything in Startup +',
    featList: [
      { id: 2.2, feat: 'Custom lead forms', isHightlighted: true },
      { id: 2.2, feat: 'Personalize demo', isHightlighted: true },
      { id: 2.2, feat: 'Hubspot Integration', isHightlighted: true },
      { id: 2.3, feat: 'Advanced lead level analytics', isHightlighted: true },
      { id: 2.5, feat: 'Advanced branching demo', isHightlighted: false },
      { id: 2.6, feat: 'Audio & video guides', isHightlighted: false },
      { id: 2.7, feat: 'Demo templates', isHightlighted: false },
      { id: 2.8, feat: 'Share demo with select group', isHightlighted: false },
      { id: 2.9, feat: 'Branded landing page for demo', isHightlighted: false },
      { id: 2.11, feat: 'Dedicated support', isHightlighted: false },
    ],
  },
  {
    id: 4,
    planName: 'Enterprise',
    planId: 'enterprise',
    featTitle: 'Everything in Business +',
    featList: [
      { id: 3.2, feat: 'Multi-team', isHightlighted: false },
      { id: 3.3, feat: 'Custom pricing', isHightlighted: false },
      { id: 3.4, feat: 'SSO', isHightlighted: true },
      { id: 3.4, feat: 'Salesforce Integration', isHightlighted: true },
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

export const LifetimePriceDetailsData: Array<IPriceDetails> = [
  {
    id: 1,
    planName: 'Tier 1',
    planId: 'lifetime',
    featTitle: '',
    priceLifetime: 49,
    featList: [
      { id: 1.12, feat: '1 domain for embedding/sharing', isHightlighted: false },
      { id: 1.13, feat: '1 creator', isHightlighted: false },
      { id: 1.14, feat: 'Unlimited published demos', isHightlighted: true },
      { id: 1.15, feat: 'Unlimited demos, views and viewers', isHightlighted: true },
      { id: 1.16, feat: 'Custom branding', isHightlighted: false },
      { id: 1.17, feat: 'Share as link or embed', isHightlighted: false },
      { id: 1.18, feat: 'Enable hotspot', isHightlighted: false },
      { id: 1.19, feat: 'Basic analytics', isHightlighted: false },
      { id: 1.20, feat: 'Auto-stitch of demo workflows', isHightlighted: false },
      { id: 1.21, feat: 'Text & image in annotation message', isHightlighted: false },
      { id: 1.22, feat: 'Figma support', isHightlighted: false },
      { id: 1.23, feat: 'Custom webhooks', isHightlighted: false },
      { id: 1.24, feat: 'No watermark', isHightlighted: false },
    ],
    buttonText: 'Contact Sales',
    buttonLink: 'mailto:vikas@sharefable.com?subject=Enterprise%20plan%20of%20Fable'
  },
  {
    id: 2,
    planName: 'Tier 2',
    planId: 'lifetime',
    priceLifetime: 119,
    featTitle: '',
    featList: [
      { id: 2.09, feat: 'Call-to-action buttons', isHightlighted: false },
      { id: 2.10, feat: 'Customize demo loader', isHightlighted: false },
      { id: 2.11, feat: 'Multi-flow demos with modules', isHightlighted: false },
      { id: 2.12, feat: '3 domain for embedding/sharing', isHightlighted: false },
      { id: 2.13, feat: '3 creator', isHightlighted: false },
      { id: 2.14, feat: 'Unlimited published demos', isHightlighted: true },
      { id: 2.15, feat: 'Unlimited demos, views and viewers', isHightlighted: true },
      { id: 2.16, feat: 'Custom branding', isHightlighted: false },
      { id: 2.17, feat: 'Share as link or embed', isHightlighted: false },
      { id: 2.18, feat: 'Enable hotspot', isHightlighted: false },
      { id: 2.19, feat: 'Basic analytics', isHightlighted: false },
      { id: 2.20, feat: 'Auto-stitch of demo workflows', isHightlighted: false },
      { id: 2.21, feat: 'Text & image in annotation message', isHightlighted: false },
      { id: 2.22, feat: 'Figma support', isHightlighted: false },
      { id: 2.23, feat: 'Custom webhooks', isHightlighted: false },
      { id: 2.24, feat: 'No watermark', isHightlighted: false },
    ],
    buttonText: 'Contact Sales',
    buttonLink: 'mailto:vikas@sharefable.com?subject=Enterprise%20plan%20of%20Fable'
  },
  {
    id: 3,
    planName: 'Tier 3',
    planId: 'lifetime',
    priceLifetime: 249,
    featTitle: '',
    featList: [
      { id: 3.06, feat: 'Custom lead form', isHightlighted: false },
      { id: 3.07, feat: 'On-screen HTML customization', isHightlighted: false },
      { id: 3.08, feat: 'HubSpot integration', isHightlighted: false },
      { id: 3.09, feat: 'Call-to-action buttons', isHightlighted: false },
      { id: 3.10, feat: 'Customize demo loader', isHightlighted: false },
      { id: 3.11, feat: 'Multi-flow demos with modules', isHightlighted: false },
      { id: 3.12, feat: '10 domain for embedding/sharing', isHightlighted: false },
      { id: 3.13, feat: 'unlimited creator', isHightlighted: false },
      { id: 3.14, feat: 'Unlimited published demos', isHightlighted: true },
      { id: 3.15, feat: 'Unlimited demos, views and viewers', isHightlighted: true },
      { id: 3.16, feat: 'Custom branding', isHightlighted: false },
      { id: 3.17, feat: 'Share as link or embed', isHightlighted: false },
      { id: 3.18, feat: 'Enable hotspot', isHightlighted: false },
      { id: 3.19, feat: 'Basic analytics', isHightlighted: false },
      { id: 3.20, feat: 'Auto-stitch of demo workflows', isHightlighted: false },
      { id: 3.21, feat: 'Text & image in annotation message', isHightlighted: false },
      { id: 3.22, feat: 'Figma support', isHightlighted: false },
      { id: 3.23, feat: 'Custom webhooks', isHightlighted: false },
      { id: 3.24, feat: 'No watermark', isHightlighted: false },
    ],
    buttonText: 'Contact Sales',
    buttonLink: 'mailto:vikas@sharefable.com?subject=Enterprise%20plan%20of%20Fable'
  }
];
