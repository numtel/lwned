// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILoan.sol";
import "./ILwnedFrontendList.sol";
import "./Strings.sol";
import "./utils.sol";

contract ActiveLoan {
  function renderDetails(ILwnedBrowser.LoanDetails memory active, IERC20 token, ILwnedFrontendList list) internal view returns(bytes memory) {
    return `
      <dl>
        <dt>Borrower</dt>
        <dd>${list.renderUserBadge(active.borrower)}</dd>
        <dt>Status</dt>
        <dd>${Strings.toString(active.status)}</dd>
        <dt>Loan Amount</dt>
        <dd>${list.renderToken(active.amountToGive, token)}
          <span class="my-investment" data-decimals="${Strings.toString(ILoan(active.loan).decimals())}"></span></dd>
        <dt>Repayment Amount</dt>
        <dd>${list.renderToken(active.amountToRepay, token)} by <span class="timestamp">${Strings.toString(active.deadlineRepay)}</span></dd>
        <dt>Collateral Offered</dt>
        <dd>${list.renderCollateral(active)}</dd>
        <dt>Submission Statement</dt>
        <dd>${utils.userInputFilter(active.text)}</dd>
      </dl>
    `;
  }

  function render(ILwnedBrowser.LoanDetails memory active) external view returns(bytes memory) {
    IERC20 token = IERC20(active.token);
    ILwnedFrontendList list = ILwnedFrontendList(msg.sender);
    return `<li data-address="${Strings.toHexString(active.loan)}">
      ${renderDetails(active, token, list)}
      <button>Comments: ${Strings.toString(active.commentCount)}</button>
    </li>`;
  }
}
