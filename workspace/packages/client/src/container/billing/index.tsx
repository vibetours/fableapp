import React from 'react';
import { connect } from 'react-redux';
import { ApiResp, Interval, Plan, ReqSubscriptionInfo, RespOrg, RespSubsValidation, RespUser, Status } from '@fable/common/dist/api-contract';
import { ArrowRightOutlined,
  CreditCardFilled,
  HeartFilled,
  InfoCircleOutlined,
  LoadingOutlined,
  WalletFilled
} from '@ant-design/icons';
import { Modal } from 'antd';
import api from '@fable/common/dist/api';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { TState } from '../../reducer';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import SidePanel from '../../component/side-panel';
import { P_RespSubscription } from '../../entity-processor';
import { checkout, getSubscriptionOrCheckoutNew } from '../../action/creator';
import * as Tags from './styled';
import Button from '../../component/button';
import { IPriceDetails, LifetimePriceDetailsData, PriceDetailsData } from './plans';
import TopLoader from '../../component/loader/top-loader';
import { withRouter, WithRouterProps } from '../../router-hoc';
import { TOP_LOADER_DURATION } from '../../constants';
import { mapPlanIdAndIntervals } from '../../utils';

const { confirm } = Modal;

declare const Chargebee: any;

interface IDispatchProps {
  checkout: typeof checkout,
  getSubscriptionOrCheckoutNew: typeof getSubscriptionOrCheckoutNew
}

const mapDispatchToProps = (dispatch: any) => ({
  checkout: (
    chosenPlan: 'solo' | 'startup' | 'business' | 'lifetime',
    chosenInterval: 'annual' | 'monthly' | 'lifetime',
  ) => dispatch(checkout(chosenPlan, chosenInterval)),
  getSubscriptionOrCheckoutNew: () => dispatch(getSubscriptionOrCheckoutNew)
});

interface IAppStateProps {
  subs: P_RespSubscription | null;
  org: RespOrg | null;
  principal: RespUser | null;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  subs: state.default.subs,
  org: state.default.org,
  principal: state.default.principal,
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps & IAppStateProps & IDispatchProps & WithRouterProps<{}>;

interface IOwnStateProps {
  tabSelected: 'Monthly' | 'Yearly';
  shouldBlock: boolean;
  reqPlanId: IPriceDetails['planId'] | null,
}

class UserManagementAndSubscription extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      tabSelected: 'Yearly',
      shouldBlock: false,
      reqPlanId: null
    };
  }

  componentDidMount(): void {
    document.title = this.props.title;

    Chargebee.init({
      site: process.env.REACT_APP_CHARGEBEE_SITE,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  checkSubscriptionValidation = async (): Promise<RespSubsValidation> => {
    const data = await api<null, ApiResp<RespSubsValidation>>('/subsvalid', {
      auth: true
    });
    return data.data;
  };

  // eslint-disable-next-line class-methods-use-this
  openCheckout = (planDetails?: {
    planId: 'solo' | 'startup' | 'business' | 'lifetime',
    interval: 'monthly' | 'annual'
  }, fn?: () => void) => {
    const cbInstance = Chargebee.getInstance();
    const details = planDetails ? mapPlanIdAndIntervals(planDetails.planId, planDetails.interval) : undefined;
    cbInstance.openCheckout({
      hostedPage() {
        return api<ReqSubscriptionInfo | undefined, null>('/genchckouturl', {
          method: 'POST',
          body: (details && details.interval && details.plan) ? {
            pricingPlan: details.plan,
            pricingInterval: details.interval
          } : undefined
        });
      },
      loaded() { },
      error(e: Error) { raiseDeferredError(e); },
      close() {
        confirm({
          title: 'Billing Information',
          content: (
            <div>
              <p>
                <ArrowRightOutlined /> If you have made a payment it might take couple of minutes to update the subscription information.
              </p>
              <p>
                <ArrowRightOutlined /> If your payment fails, you will receive email regrading the reason of failure and the next steps. We allow couple of days before we cancel the subscription in case of payment failure.
              </p>
              <p>
                <ArrowRightOutlined /> Your invoice and transaction information will be emailed to you and will appear in this page soon.
              </p>
              <p>
                <ArrowRightOutlined /> In case of any queries reach out to <a href="mailto:support@sharefable.com">support@sharefable.com</a> or use the in app chat.
              </p>
            </div>
          ),
          icon: <InfoCircleOutlined />,
          onOk() { },
          onCancel() { },
          okType: 'primary'
        });
      },
      success: () => {
        this.props.getSubscriptionOrCheckoutNew();
        fn && fn();
      },
      step() { }
    });
  };

  // eslint-disable-next-line class-methods-use-this
  openCheckoutForQuillyCredit = () => {
    const cbInstance = Chargebee.getInstance();
    cbInstance.openCheckout({
      hostedPage() {
        return api<ReqSubscriptionInfo | undefined, null>('/credittopupurl', {
          method: 'POST',
          auth: true
        });
      },
      loaded() { },
      error(e: Error) { raiseDeferredError(e); },
      close() { },
      success: () => {
        this.props.getSubscriptionOrCheckoutNew();
      },
      step() { }
    });
  };

  render(): JSX.Element {
    const priceFor: 'priceAnnual' | 'priceMonthly' | undefined = this.state.tabSelected === 'Yearly'
      ? 'priceAnnual'
      : 'priceMonthly';
    let isSameInterval = false;
    let currentPlan = '';
    let tier = '';
    let isLifetimePlan = false;
    if (this.props.subs) {
      isLifetimePlan = this.props.subs.paymentInterval === Interval.LIFETIME;
      isSameInterval = this.props.subs.paymentInterval === this.state.tabSelected.toUpperCase();
      currentPlan = this.props.subs.paymentPlan === Plan.STARTUP ? 'startup' : (this.props.subs.paymentPlan === Plan.SOLO ? 'solo' : 'business');

      if (isLifetimePlan) {
        tier = this.props.subs.paymentPlan.at(-1) || '';
      }
    }

    return (
      <GTags.ColCon style={{
        background: isLifetimePlan ? '#fbf6ff' : undefined
      }}
      >
        {this.props.loadingState === 'loading' && <TopLoader duration={TOP_LOADER_DURATION} showLogo={false} showOverlay />}
        <div style={{ height: '48px' }}>
          <Header
            subs={this.props.subs}
            tour={null}
            org={this.props.org}
            shouldShowFullLogo
            principal={this.props.principal}
            leftElGroups={[]}
          />
        </div>
        <GTags.RowCon style={{ height: 'calc(100% - 48px)' }}>
          <GTags.SidePanelCon>
            <SidePanel selected="billing" subs={this.props.subs} />
          </GTags.SidePanelCon>
          <GTags.MainCon>
            <GTags.BodyCon style={{ height: '100%', position: 'relative', overflowY: 'scroll' }}>
              {this.props.subs ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%'
                }}
                >
                  {isLifetimePlan && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem 0 3rem',
                    margin: '0 0 3rem',
                    borderBottom: '1px solid #eaeaea',
                    background: 'white'
                  }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                      <div className="typ-h1">You are on Fable's Lifetime plan</div>
                      <div className="typ-reg">You can upgrade / downgrade Fable directly from AppSumo</div>
                      <Tags.ABtn href="https://appsumo.com/account/products/" className="typ-btn" target="_blank">
                        Manage AppSumo License
                      </Tags.ABtn>
                      <Tags.PriceCon style={{
                        marginTop: '1rem'
                      }}
                      >
                        {LifetimePriceDetailsData.map((plan: IPriceDetails) => (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                            }}
                            key={plan.id}
                          >
                            <div style={{
                              fontWeight: 400,
                              fontSize: '2rem'
                            }}
                            >{plan.planName}
                              {plan.id === +tier && (
                              <span style={{
                                background: 'rgb(255, 238, 78)',
                                border: '2px solid rgb(255, 188, 0)',
                                padding: '1px 10px',
                                marginLeft: '0.5rem',
                                borderRadius: '6px',
                                fontSize: '12px'
                              }}
                              >
                                Active
                              </span>
                              )}
                            </div>
                            <Tags.PlanPrice>${plan.priceLifetime}</Tags.PlanPrice>
                            <Tags.FeatCon showScrollMore>
                              <Tags.FeatTitle>
                                {plan.featTitle}
                              </Tags.FeatTitle>
                              <Tags.FeatList isScrollable>
                                {plan.featList.map((f, i) => (
                                  <li key={i}>
                                    <HeartFilled style={{ color: '#7567FF', marginRight: '0.5rem' }} /> {f.feat}
                                  </li>
                                ))}
                              </Tags.FeatList>
                            </Tags.FeatCon>
                          </div>
                        ))}
                      </Tags.PriceCon>
                    </div>
                  </div>
                  )}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: `${isLifetimePlan ? 0 : '3rem'} 0 3rem`,
                    gap: '1rem'
                  }}
                  >
                    <div className="typ-h1">
                      {isLifetimePlan ? 'Subscribe to our SaaS plans' : 'Upgrade / Downgrade Plan'}
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '1rem'
                    }}
                    >
                      <Button
                        icon={<CreditCardFilled />}
                        iconPlacement="left"
                        onClick={() => {
                          this.openCheckout();
                        }}
                      >
                        Make Payment
                      </Button>
                      <Button
                        icon={<WalletFilled />}
                        iconPlacement="left"
                        onClick={() => {
                          this.openCheckoutForQuillyCredit();
                        }}
                        style={{
                          background: '#fedf64',
                          color: 'black'
                        }}
                      >
                        Buy Quilly credit
                      </Button>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    alignItems: 'center'
                  }}
                  >
                    <Tags.TabCon>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        className={`${this.state.tabSelected === 'Yearly' ? 'active ' : ''} tab-item`}
                        onClick={() => this.setState({ tabSelected: 'Yearly' })}
                      >
                        Annually
                        <span style={{
                          fontSize: '0.8rem',
                          padding: '6px 10px',
                          background: '#fedf64',
                          borderRadius: '4px'
                        }}
                        >Save 20%
                        </span>
                      </div>
                      <div
                        onClick={() => this.setState({ tabSelected: 'Monthly' })}
                        className={`${this.state.tabSelected === 'Monthly' ? 'active ' : ''}tab-item`}
                      >Monthly
                      </div>
                    </Tags.TabCon>
                    <Tags.PriceCon>
                      {PriceDetailsData.map((plan: IPriceDetails) => (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                          key={plan.id}
                        >
                          <div style={{
                            fontWeight: 400,
                            fontSize: '2rem'
                          }}
                          >{plan.planName}
                          </div>
                          <Tags.PlanPrice>{plan[priceFor] !== undefined ? (
                            <>
                              {plan[priceFor] === 0 ? 'Free' : `$${plan[priceFor]}`}
                              <span style={{
                                fontSize: '0.8rem',
                              }}
                              >
                                { plan[priceFor] ? <div style={{ marginBottom: '1rem', opacity: '0.6' }}>per month </div> : <></> }
                              </span>
                            </>
                          ) : "Let's talk"}
                          </Tags.PlanPrice>
                          <div>
                            <Button
                              intent="secondary"
                              iconPlacement="left"
                              icon={this.state.shouldBlock && plan.planId === this.state.reqPlanId ? <LoadingOutlined /> : undefined}
                              className={this.state.shouldBlock ? 'disabled' : ''}
                              style={{
                                pointerEvents: plan.planId === currentPlan && (isSameInterval || plan.planId === 'solo') ? 'none' : 'all',
                                opacity: plan.planId === currentPlan && (isSameInterval || plan.planId === 'solo') ? 0.55 : 1,
                              }}
                              onClick={async () => {
                                if (plan.planId === 'enterprise') {
                                  window.open(plan.buttonLink!, '__blank');
                                  return;
                                }
                                const interval = this.state.tabSelected === 'Monthly' ? 'monthly' : 'annual';
                                this.setState({ shouldBlock: true, reqPlanId: plan.planId });

                                const validation = await this.checkSubscriptionValidation();
                                const planId = plan.planId;
                                if (validation.cardPresent || planId === 'solo' || this.props.subs!.status === Status.IN_TRIAL) {
                                  await this.props.checkout(planId, interval);
                                  this.setState({ shouldBlock: false, reqPlanId: null });
                                } else {
                                  this.openCheckout({
                                    planId,
                                    interval
                                  }, async () => {
                                    await this.props.checkout(planId, interval);
                                    this.setState({ shouldBlock: false, reqPlanId: null });
                                  });
                                }
                              }}
                            >
                              {plan.planId === currentPlan && (isSameInterval || plan.planId === 'solo') ? 'Subscribed' : 'Choose'}
                            </Button>
                          </div>
                          <Tags.FeatCon showScrollMore={false}>
                            <Tags.FeatTitle>
                              {plan.featTitle}
                            </Tags.FeatTitle>
                            <Tags.FeatList isScrollable={false}>
                              {plan.featList.map((f, i) => (
                                <li key={i}>
                                  <HeartFilled style={{ color: '#7567FF', marginRight: '0.5rem' }} /> {f.feat}
                                </li>
                              ))}
                            </Tags.FeatList>
                          </Tags.FeatCon>
                        </div>
                      ))}
                    </Tags.PriceCon>
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  <TopLoader duration={TOP_LOADER_DURATION} showLogo text="Loading subscription information" />
                </div>
              )}
            </GTags.BodyCon>
          </GTags.MainCon>
        </GTags.RowCon>
      </GTags.ColCon>
    );
  }
}

export default connect<IAppStateProps, IDispatchProps, IOwnProps, TState>(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(UserManagementAndSubscription));
