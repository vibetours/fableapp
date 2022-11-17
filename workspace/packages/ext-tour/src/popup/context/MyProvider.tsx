import { Component } from "react";
import MyContext from "./MyContext";
import { NavigatePage } from "../../types";

type Props = {};
type State = {};

class MyProvider extends Component<Props, State> {
  state = {
    name: "John",
    age: 24,
  };

  navigatePage = (active: NavigatePage) => {
    this.setState({ active });
  };

  render() {
    return (
      <MyContext.Provider
        value={{
          state: this.state,
          navigatePage: this.navigatePage,
        }}
      >
        {this.props.children}
      </MyContext.Provider>
    );
  }
}

export default MyProvider;
