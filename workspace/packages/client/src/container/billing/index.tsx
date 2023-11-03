import React from 'react';
import { connect } from 'react-redux';
import { Plan, RespUser } from '@fable/common/dist/api-contract';
import { ArrowRightOutlined,
  CreditCardFilled,
  HeartFilled,
  InfoCircleOutlined
} from '@ant-design/icons';
import Modal from 'antd/lib/modal';
import api from '@fable/common/dist/api';
import raiseDeferredError from '@fable/common/dist/deferred-error';
import { TState } from '../../reducer';
import * as GTags from '../../common-styled';
import Header from '../../component/header';
import SidePanel from '../../component/side-panel';
import { P_RespSubscription } from '../../entity-processor';
import { checkout } from '../../action/creator';
import Loader from '../../component/loader';
import * as Tags from './styled';
import Button from '../../component/button';
import { IPriceDetails, PriceDetailsData } from './plans';

const { confirm } = Modal;

declare const Chargebee: any;

interface IDispatchProps {
  checkout: typeof checkout
}

const mapDispatchToProps = (dispatch: any) => ({
  checkout: (chosenPlan: 'startup' | 'business', chosenInterval: 'annual' | 'monthly') => dispatch(checkout(chosenPlan, chosenInterval)),
});

interface IAppStateProps {
  subs: P_RespSubscription | null;
  principal: RespUser | null;
  manifestPath: string;
}

const mapStateToProps = (state: TState): IAppStateProps => ({
  subs: state.default.subs,
  principal: state.default.principal,
  manifestPath: state.default.commonConfig
    ? state.default.commonConfig.pubTourAssetPath + state.default.commonConfig.manifestFileName
    : '',
});

interface IOwnProps {
  title: string;
}

type IProps = IOwnProps & IAppStateProps & IDispatchProps;

interface IOwnStateProps {
  tabSelected: 'Monthly' | 'Yearly';
}

class UserManagementAndSubscription extends React.PureComponent<IProps, IOwnStateProps> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      tabSelected: 'Yearly',
    };
  }

  componentDidMount(): void {
    document.title = this.props.title;

    Chargebee.init({
      site: process.env.REACT_APP_CHARGEBEE_SITE,
    });
  }

  render(): JSX.Element {
    const priceFor: 'priceAnnual' | 'priceMonthly' | undefined = this.state.tabSelected === 'Yearly'
      ? 'priceAnnual'
      : 'priceMonthly';
    let isSameInterval = false;
    let currentPlan = '';
    if (this.props.subs) {
      isSameInterval = this.props.subs.paymentInterval === this.state.tabSelected.toUpperCase();
      currentPlan = this.props.subs.paymentPlan === Plan.STARTUP ? 'startup' : 'business';
    }
    return (
      <GTags.ColCon>
        <div style={{ height: '48px' }}>
          <Header
            tour={null}
            subs={this.props.subs}
            shouldShowFullLogo
            principal={this.props.principal}
            leftElGroups={[]}
            manifestPath={this.props.manifestPath}
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
                  margin: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%'
                }}
                >
                  <div style={{ maxWidth: '43.5rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    >
                      <Tags.Heading style={{ fontWeight: 400 }}>Upgrade / Downgrade Plan</Tags.Heading>
                      <Button
                        icon={<CreditCardFilled />}
                        iconPlacement="left"
                        onClick={() => {
                          const cbInstance = Chargebee.getInstance();
                          cbInstance.openCheckout({
                            hostedPage() {
                              return api('/genchckouturl', {
                                method: 'POST'
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
                                      <ArrowRightOutlined /> If you have made a payment it might take couple of minutes to upadate the subscription information.
                                    </p>
                                    <p>
                                      <ArrowRightOutlined /> If your payment fails, you would receive email regrading the reason of failure and the next steps. We allow couple of days before we cancel the subscription in case of payment failure.
                                    </p>
                                    <p>
                                      <ArrowRightOutlined /> Your invoice and transaction information would be emailed to you and would appear in this page soon.
                                    </p>
                                    <p>
                                      <ArrowRightOutlined /> In case of any queries reach out to <a href="mailto:hello@sharefable.com">hello@sharefable.com</a>
                                    </p>
                                  </div>
                                ),
                                icon: <InfoCircleOutlined />,
                                onOk() { },
                                onCancel() { },
                                okType: 'primary'
                              });
                            },
                            success() { },
                            step() { }
                          });
                        }}
                      >
                        Make Payment
                      </Button>
                    </div>
                  </div>
                  <div style={{ margin: '1rem 0 3rem' }}>
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontStyle: 'italic',
                      }}
                    >
                      <InfoCircleOutlined /> &nbsp;
                      Your payment's invoice would  be mailed to you. Invoices would appear here soon.
                    </span>
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
                          <Tags.PlanPrice>{plan[priceFor] ? (
                            <>
                              ${plan[priceFor]}
                              <span style={{
                                fontSize: '0.8rem',
                              }}
                              >
                                <div style={{ marginBottom: '1rem', opacity: '0.6' }}>per month </div>
                              </span>
                            </>
                          ) : "Let's talk"}
                          </Tags.PlanPrice>
                          <div>
                            <Button
                              intent="secondary"
                              style={{
                                pointerEvents: plan.planId === currentPlan && isSameInterval ? 'none' : 'all',
                              }}
                              onClick={() => {
                                if (plan.planId === 'enterprise') {
                                  window.open(plan.buttonLink!, '__blank');
                                  return;
                                }
                                const interval = this.state.tabSelected === 'Monthly' ? 'monthly' : 'annual';
                                this.props.checkout(plan.planId, interval);
                              }}
                            >
                              {plan.planId === currentPlan && isSameInterval ? 'Subscribed' : 'Choose'}
                            </Button>
                          </div>
                          <Tags.FeatCon>
                            <Tags.FeatTitle>
                              {plan.featTitle}
                            </Tags.FeatTitle>
                            <Tags.FeatList>
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
                <div>
                  <Loader width="80px" txtBefore="Loading subscription information" showAtPageCenter />
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
)(UserManagementAndSubscription);
