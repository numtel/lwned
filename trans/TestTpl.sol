// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Strings.sol";

contract TestTpl {
  uint public value;

  function setValue(uint newValue) external {
    value = newValue;
  }

  function render() external view returns(bytes memory) {
    return abi.encodePacked("<p>",Strings.toString(value),"</p>");
  }
}
