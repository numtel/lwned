// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILoan.sol";
import "./ILwnedFrontendList.sol";
import "./Strings.sol";
import "./utils.sol";

contract PendingLoan {

  function renderInvestForm(ILwnedBrowser.LoanDetails memory pending, IERC20 token) internal view returns(bytes memory) {
    return `<form id="invest-${Strings.toHexString(pending.loan)}" style="display:none;" onsubmit="submitInvest(this); return false;" data-token="${Strings.toHexString(pending.token)}" data-decimals="${Strings.toString(token.decimals())}" data-loan="${Strings.toHexString(pending.loan)}">
      <fieldset><legend>Invest in Loan Principal</legend>
        <dl>
        <dt>Amount <span class="my-balance"></span></dt>
        <dd><input required></dd>
        </dl>
        <p><a href="https://polygonscan.com/address/${Strings.toHexString(pending.loan)}">View Loan Contract on Explorer</a></p>
        <button type="submit">Submit</button>
        <button type="button" onclick="this.closest('form').style.display = 'none'">Cancel</button>
      </fieldset>
    </form>`;
  }

  function renderDivestForm(ILwnedBrowser.LoanDetails memory pending, IERC20 token) internal view returns(bytes memory) {
    return `<form id="divest-${Strings.toHexString(pending.loan)}" style="display:none;" onsubmit="submitDivest(this); return false;" data-token="${Strings.toHexString(pending.token)}" data-decimals="${Strings.toString(token.decimals())}" data-loan="${Strings.toHexString(pending.loan)}">
      <fieldset><legend>Divest from Loan Principal</legend>
        <dl>
        <dt>Amount <span class="my-investment"></span></dt>
        <dd><input required></dd>
        </dl>
        <p><a href="https://polygonscan.com/address/${Strings.toHexString(pending.loan)}">View Loan Contract on Explorer</a></p>
        <button type="submit">Submit</button>
        <button type="button" onclick="this.closest('form').style.display = 'none'">Cancel</button>
      </fieldset>
    </form>`;
  }

  function renderPendingLoanDetails(ILwnedBrowser.LoanDetails memory pending, IERC20 token, ILwnedFrontendList list) internal view returns(bytes memory) {
    return `
      <dl>
        <dt>Borrower</dt>
        <dd>${list.renderUserBadge(pending.borrower)}</dd>
        <dt>Loan Amount</dt>
        <dd>Total ${list.renderToken(pending.amountToGive, token)} to raise by <span class="timestamp">${Strings.toString(pending.deadlineIssue)}</span>, ${list.renderToken(ILoan(pending.loan).totalSupply(), token)} raised so far</dd>
        <dt>Repayment Amount</dt>
        <dd>${list.renderToken(pending.amountToRepay, token)} by <span class="timestamp">${Strings.toString(pending.deadlineRepay)}</span></dd>
        <dt>Collateral Offered</dt>
        <dd>${list.renderCollateral(pending)}</dd>
        <dt>Submission Statement</dt>
        <dd>${utils.userInputFilter(pending.text)}</dd>
      </dl>
    `;
  }

  function render(ILwnedBrowser.LoanDetails memory pending) external view returns(bytes memory) {
    IERC20 token = IERC20(pending.token);
    ILwnedFrontendList list = ILwnedFrontendList(msg.sender);
    bool principalMet = ILoan(pending.loan).totalSupply() == pending.amountToGive;
    bytes memory issueButton;
    bytes memory investButton;
    if(principalMet) {
      issueButton = `
        <button data-only="${Strings.toHexString(pending.borrower)}" style="display:none;" onclick="submitIssue(this)">Issue</button>
      `;
    } else {
      investButton = `
        <button data-toggle="invest-${Strings.toHexString(pending.loan)}">Invest</button>
      `;
    }
    return `<li data-address="${Strings.toHexString(pending.loan)}">
      ${renderPendingLoanDetails(pending, token, list)}
      <button>Comments: ${Strings.toString(pending.commentCount)}</button>
      ${investButton}
      <button data-toggle="divest-${Strings.toHexString(pending.loan)}">Divest</button>
      <button data-only="${Strings.toHexString(pending.borrower)}" style="display:none;" onclick="submitCancel(this)">Cancel</button>
      ${issueButton}

      ${renderInvestForm(pending, token)}
      ${renderDivestForm(pending, token)}
    </li>`;
  }
}

