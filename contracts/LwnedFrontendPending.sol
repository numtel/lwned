// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILwned.sol";
import "./ILoan.sol";
import "./ILwnedBrowser.sol";
import "./Strings.sol";

contract LwnedFrontendPending {
  ILwned public factory;
  ILwnedBrowser public browser;

  constructor(ILwned _factory, ILwnedBrowser _browser) {
    factory = _factory;
    browser = _browser;
  }

  function render() external view returns(bytes memory) {
    return `
      <p><a href="#">Return to Index...</a></p>
      <p>Pending loan count: ${Strings.toString(factory.pendingCount())}</p>
    `;
  }

}

