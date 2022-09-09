// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILwned.sol";
import "./ILoan.sol";
import "./ILwnedBrowser.sol";
import "./IERC20.sol";
import "./Strings.sol";

contract LwnedFrontendPending {
  ILwned public factory;
  ILwnedBrowser public browser;

  constructor(ILwned _factory, ILwnedBrowser _browser) {
    factory = _factory;
    browser = _browser;
  }

  function render() external view returns(bytes memory) {
    bytes memory pendingRendered;
    if(factory.pendingCount() > 0) {
      ILwnedBrowser.LoanDetails[] memory pending = browser.pending(address(factory), 0, 100);
      if(pending.length == 0) {
        pendingRendered = `<p class="empty">No pending loan applications!</p>`;
      } else {
        pendingRendered = `<ul>`;
        for(uint i = 0; i < pending.length; i++) {
          IERC20 token = IERC20(pending[i].token);
          pendingRendered = `${pendingRendered}<li>
            foo${Strings.toString(i)}
            <dl>
              <dt>Borrower</dt>
              <dd><a href="#" data-replace-address="${Strings.toHexString(pending[i].borrower)}">Borrower</a></dd>
              <dt>Amount</dt>
              <dd>${Strings.toString(pending[i].amountToGive)} ${token.symbol()}</dd>
            </dl>
          </li>`;
        }
        pendingRendered = `${pendingRendered}</ul>`;
      }
    }
    return `
      <p><a href="#">Return to Index...</a></p>
      <p>Pending loan count: ${Strings.toString(factory.pendingCount())}</p>
      ${pendingRendered}
    `;
  }

}

