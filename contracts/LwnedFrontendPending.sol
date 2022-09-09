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

  function renderCollateral(ILwnedBrowser.LoanDetails memory pending) internal view returns(bytes memory) {
    bytes memory collateralRendered;
    for(uint j = 0; j < pending.collateralTokens.length; j++) {
      IERC20 collateralToken = IERC20(pending.collateralTokens[j]);
      if(j > 0) {
        collateralRendered = `${collateralRendered}, `;
      }
      collateralRendered = `${collateralRendered}<span data-decimals="${Strings.toString(collateralToken.decimals())}">${Strings.toString(pending.collateralAmounts[j])}</span> <a href="https://polygonscan.com/address/${Strings.toHexString(address(collateralToken))}">${collateralToken.symbol()}</a>`;
    }
    return collateralRendered;
  }

  function renderToken(uint amount, IERC20 token) internal view returns(bytes memory) {
    return `<span data-decimals="${Strings.toString(token.decimals())}">${Strings.toString(amount)}</span> <a href="https://polygonscan.com/address/${Strings.toHexString(address(token))}">${token.symbol()}</a>`;
  }

  function userInputFilter(string memory input) internal pure returns(bytes memory) {
    bytes memory output = `${input}`;
    // Keep the HTML safe but don't bother with &gt; or &lt; because that changes the length
    for(uint i=0; i<output.length; i++) {
      // Replace < with [
      if(output[i] == 0x3c) output[i] = 0x5b;
      // Replace > with ]
      if(output[i] == 0x3e) output[i] = 0x5d;
    }
    return output;
  }

  function renderLoan(ILwnedBrowser.LoanDetails memory pending) internal view returns(bytes memory) {
    IERC20 token = IERC20(pending.token);
    return `<li>
      <dl>
        <dt>Borrower</dt>
        <dd><a href="#" data-replace-address="${Strings.toHexString(pending.borrower)}">Borrower</a></dd>
        <dt>Loan Amount</dt>
        <dd>${renderToken(pending.amountToGive, token)} to raise by <span class="timestamp">${Strings.toString(pending.deadlineIssue)}</span></dd>
        <dt>Repayment Amount</dt>
        <dd>${renderToken(pending.amountToRepay, token)} by <span class="timestamp">${Strings.toString(pending.deadlineRepay)}</span></dd>
        <dt>Collateral Offered</dt>
        <dd>${renderCollateral(pending)}</dd>
        <dt>Submission Statement</dt>
        <dd>${userInputFilter(pending.text)}</dd>
      </dl>
      <button>Comments: ${Strings.toString(pending.commentCount)}</button>
      <button>Invest</button>
      <button>Divest</button>
    </li>`;
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
          pendingRendered = `${pendingRendered}${renderLoan(pending[i])}`;
        }
        pendingRendered = `${pendingRendered}</ul>`;
      }
    }
    return `
      <p><a href="#">Return to Index...</a></p>
      <p>Pending loan count: ${Strings.toString(factory.pendingCount())}</p>
      ${pendingRendered}
      <script>
        document.querySelectorAll('[data-decimals]').forEach(span => {
          span.innerHTML = applyDecimals(span.innerHTML, span.getAttribute('data-decimals'));
        });
        document.querySelectorAll('span.timestamp').forEach(span => {
          span.innerHTML = new Date(span.innerHTML * 1000).toLocaleString();
        });
      </script>
    `;
  }

}

