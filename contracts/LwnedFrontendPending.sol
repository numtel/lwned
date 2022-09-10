// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILwned.sol";
import "./ILoan.sol";
import "./ILwnedBrowser.sol";
import "./IERC20.sol";
import "./IUserBadge.sol";
import "./Strings.sol";
import "./utils.sol";

contract LwnedFrontendPending {
  ILwned public factory;
  ILwnedBrowser public browser;
  IUserBadge public userBadge;

  constructor(ILwned _factory, ILwnedBrowser _browser, IUserBadge _userBadge) {
    factory = _factory;
    browser = _browser;
    userBadge = _userBadge;
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

  function renderInvestForm(ILwnedBrowser.LoanDetails memory pending, IERC20 token) internal view returns(bytes memory) {
    return `<form id="invest-${Strings.toHexString(pending.loan)}" style="display:none;" onsubmit="submitInvest(this); return false;" data-token="${Strings.toHexString(pending.token)}" data-decimals="${Strings.toString(token.decimals())}" data-loan="${Strings.toHexString(pending.loan)}">
      <fieldset><legend>Invest in Loan Principal</legend>
        <dl>
        <dt>Amount <span class="my-balance"></span></dt>
        <dd><input required></dd>
        </dl>
        <button type="submit">Submit</button>
        <a href="https://polygonscan.com/address/${Strings.toHexString(pending.loan)}">View Loan Contract on Explorer</a>
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
        <button type="submit">Submit</button>
        <a href="https://polygonscan.com/address/${Strings.toHexString(pending.loan)}">View Loan Contract on Explorer</a>
      </fieldset>
    </form>`;
  }

  function renderLoanDetails(ILwnedBrowser.LoanDetails memory pending, IERC20 token) internal view returns(bytes memory) {
    return `
      <dl>
        <dt>Borrower</dt>
        <dd>${userBadge.render(pending.borrower)}</dd>
        <dt>Loan Amount</dt>
        <dd>Total ${renderToken(pending.amountToGive, token)} to raise by <span class="timestamp">${Strings.toString(pending.deadlineIssue)}</span>, ${renderToken(ILoan(pending.loan).totalSupply(), token)} raised so far</dd>
        <dt>Repayment Amount</dt>
        <dd>${renderToken(pending.amountToRepay, token)} by <span class="timestamp">${Strings.toString(pending.deadlineRepay)}</span></dd>
        <dt>Collateral Offered</dt>
        <dd>${renderCollateral(pending)}</dd>
        <dt>Submission Statement</dt>
        <dd>${utils.userInputFilter(pending.text)}</dd>
      </dl>
    `;
  }

  function renderLoan(ILwnedBrowser.LoanDetails memory pending) internal view returns(bytes memory) {
    IERC20 token = IERC20(pending.token);
    bool principalMet = ILoan(pending.loan).totalSupply() == pending.amountToGive;
    bytes memory issueButton;
    if(principalMet) {
      issueButton = `
        <button data-only="${Strings.toHexString(pending.borrower)}" style="display:none;" onclick="submitIssue(this)">Issue</button>
      `;
    }
    return `<li data-address="${Strings.toHexString(pending.loan)}">
      ${renderLoanDetails(pending, token)}
      <button>Comments: ${Strings.toString(pending.commentCount)}</button>
      <button data-toggle="invest-${Strings.toHexString(pending.loan)}">Invest</button>
      <button data-toggle="divest-${Strings.toHexString(pending.loan)}">Divest</button>
      <button data-only="${Strings.toHexString(pending.borrower)}" style="display:none;" onclick="submitCancel(this)">Cancel</button>
      ${issueButton}

      ${renderInvestForm(pending, token)}
      ${renderDivestForm(pending, token)}
    </li>`;
  }

  function render() external view returns(bytes memory) {
    bytes memory pendingRendered;
    if(factory.pendingCount() > 0) {
      // TODO pagination!
      ILwnedBrowser.LoanDetails[] memory pending = browser.pending(address(factory), 0, 100);
      if(pending.length == 0) {
        pendingRendered = `<p class="empty">No pending loan applications!</p>`;
      } else {
        pendingRendered = `<ul class="pending">`;
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
        (async function() {
          const result = await wallet();
          window.accounts = result.accounts;
          window.web3 = result.web3;

          document.querySelectorAll('[data-only]').forEach(el => {
            if(el.getAttribute('data-only').toLowerCase() === accounts[0].toLowerCase()) {
              el.style.display = "";
            }
          });

          document.querySelectorAll('form .my-balance').forEach(async (span) => {
            form = span.closest('form');
            const balance = web3.eth.abi.decodeParameter('uint256', await web3.eth.call({
              to: form.getAttribute('data-token'),
              data: web3.eth.abi.encodeFunctionCall({
                name: 'balanceOf', type: 'function',
                inputs: [{ type: 'address', name:'user'}]
              }, [accounts[0]]),
            }));

            span.innerHTML = '(Balance: ' + applyDecimals(balance, form.getAttribute('data-decimals')) + ')';
          });

          document.querySelectorAll('form .my-investment').forEach(async (span) => {
            form = span.closest('form');
            const balance = web3.eth.abi.decodeParameter('uint256', await web3.eth.call({
              to: form.getAttribute('data-loan'),
              data: web3.eth.abi.encodeFunctionCall({
                name: 'balanceOf', type: 'function',
                inputs: [{ type: 'address', name:'user'}]
              }, [accounts[0]]),
            }));

            span.innerHTML = '(Invested: ' + applyDecimals(balance, form.getAttribute('data-decimals')) + ')';
          });
        })();

        document.querySelectorAll('[data-decimals]').forEach(span => {
          span.innerHTML = applyDecimals(span.innerHTML, span.getAttribute('data-decimals'));
        });
        document.querySelectorAll('span.timestamp').forEach(span => {
          span.innerHTML = new Date(span.innerHTML * 1000).toLocaleString();
        });
        document.querySelectorAll('ul.pending>li').forEach(loan => {
          
        });
        document.querySelectorAll('[data-toggle]').forEach(toggler => {
          toggler.addEventListener('click', function() {
            const el = document.getElementById(toggler.getAttribute('data-toggle'));
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
          }, false);
        });

        async function submitInvest(form) {
          const amount = reverseDecimals(form.querySelector('input').value, form.getAttribute('data-decimals'));
          await web3.eth.sendTransaction({
            to: form.getAttribute('data-token'),
            from: accounts[0],
            data: web3.eth.abi.encodeFunctionCall({
              name: 'approve', type: 'function',
              inputs: [
                { type: 'address', name:'spender'},
                { type: 'uint256', name:'amount'},
              ]
            }, [
              form.getAttribute('data-loan'),
              amount
            ])
          });
          await web3.eth.sendTransaction({
            to: form.getAttribute('data-loan'),
            from: accounts[0],
            data: web3.eth.abi.encodeFunctionCall({
              name: 'invest', type: 'function',
              inputs: [
                { type: 'uint256', name:'amount'},
              ]
            }, [
              amount
            ])
          });
          await loadPage();
        }

        async function submitDivest(form) {
          const amount = reverseDecimals(form.querySelector('input').value, form.getAttribute('data-decimals'));
          await web3.eth.sendTransaction({
            to: form.getAttribute('data-loan'),
            from: accounts[0],
            data: web3.eth.abi.encodeFunctionCall({
              name: 'divest', type: 'function',
              inputs: [
                { type: 'uint256', name:'amount'},
              ]
            }, [
              amount
            ])
          });
          await loadPage();
        }

        async function submitCancel(el) {
          await web3.eth.sendTransaction({
            to: el.closest('li[data-address]').getAttribute('data-address'),
            from: accounts[0],
            data: web3.eth.abi.encodeFunctionSignature('loanCancel()')
          });
          await loadPage();
        }

        async function submitIssue(el) {
          await web3.eth.sendTransaction({
            to: el.closest('li[data-address]').getAttribute('data-address'),
            from: accounts[0],
            data: web3.eth.abi.encodeFunctionSignature('loanIssue()')
          });
          await loadPage();
        }

        ${userBadge.renderScript()}
      </script>
    `;
  }

}

