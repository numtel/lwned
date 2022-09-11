// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILwned.sol";
import "./ILoan.sol";
import "./ILwnedBrowser.sol";
import "./IERC20.sol";
import "./IUserBadge.sol";
import "./Strings.sol";
import "./utils.sol";

contract LwnedFrontendActive {
  ILwned public factory;
  ILwnedBrowser public browser;
  IUserBadge public userBadge;

  constructor(ILwned _factory, ILwnedBrowser _browser, IUserBadge _userBadge) {
    factory = _factory;
    browser = _browser;
    userBadge = _userBadge;
  }

  function renderCollateral(ILwnedBrowser.LoanDetails memory active) internal view returns(bytes memory) {
    bytes memory collateralRendered;
    for(uint j = 0; j < active.collateralTokens.length; j++) {
      IERC20 collateralToken = IERC20(active.collateralTokens[j]);
      if(j > 0) {
        collateralRendered = `${collateralRendered}, `;
      }
      collateralRendered = `${collateralRendered}<span data-decimals="${Strings.toString(collateralToken.decimals())}">${Strings.toString(active.collateralAmounts[j])}</span> <a href="https://polygonscan.com/address/${Strings.toHexString(address(collateralToken))}">${collateralToken.symbol()}</a>`;
    }
    return collateralRendered;
  }

  function renderToken(uint amount, IERC20 token) internal view returns(bytes memory) {
    return `<span data-decimals="${Strings.toString(token.decimals())}">${Strings.toString(amount)}</span> <a href="https://polygonscan.com/address/${Strings.toHexString(address(token))}">${token.symbol()}</a>`;
  }

  function renderLoanDetails(ILwnedBrowser.LoanDetails memory active, IERC20 token) internal view returns(bytes memory) {
    return `
      <dl>
        <dt>Borrower</dt>
        <dd>${userBadge.render(active.borrower)}</dd>
        <dt>Status</dt>
        <dd>${Strings.toString(active.status)}</dd>
        <dt>Loan Amount</dt>
        <dd>${renderToken(active.amountToGive, token)}
          <span class="my-investment" data-decimals="${Strings.toString(ILoan(active.loan).decimals())}"></span></dd>
        <dt>Repayment Amount</dt>
        <dd>${renderToken(active.amountToRepay, token)} by <span class="timestamp">${Strings.toString(active.deadlineRepay)}</span></dd>
        <dt>Collateral Offered</dt>
        <dd>${renderCollateral(active)}</dd>
        <dt>Submission Statement</dt>
        <dd>${utils.userInputFilter(active.text)}</dd>
      </dl>
    `;
  }

  function renderLoan(ILwnedBrowser.LoanDetails memory active) internal view returns(bytes memory) {
    IERC20 token = IERC20(active.token);
    return `<li data-address="${Strings.toHexString(active.loan)}">
      ${renderLoanDetails(active, token)}
      <button>Comments: ${Strings.toString(active.commentCount)}</button>
    </li>`;
  }

  function render() external view returns(bytes memory) {
    return render(0, 100);
  }

  function render(uint start, uint count) public view returns(bytes memory) {
    bytes memory activeRendered;
    ILwnedBrowser.LoanDetails[] memory active;
    if(factory.activeCount() > 0) {
      // TODO pagination!
      active = browser.active(address(factory), start, count);
      if(active.length == 0) {
        activeRendered = `<p class="empty">No active loan applications!</p>`;
      } else {
        activeRendered = `<ol class="active" start="${Strings.toString(start+1)}">`;
        for(uint i = 0; i < active.length; i++) {
          activeRendered = `${activeRendered}${renderLoan(active[i])}`;
        }
        activeRendered = `${activeRendered}</ol>`;
      }
    }
    return `
      <p><a href="#">Return to Index...</a></p>
      <p>Active Loans ${Strings.toString(start+1)}-${Strings.toString(start+active.length)} of ${Strings.toString(factory.activeCount())}</p>
      ${activeRendered}
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

          document.querySelectorAll('.my-investment').forEach(async (span) => {
            const balance = web3.eth.abi.decodeParameter('uint256', await web3.eth.call({
              to: span.closest('li[data-address]').getAttribute('data-address'),
              data: web3.eth.abi.encodeFunctionCall({
                name: 'balanceOf', type: 'function',
                inputs: [{ type: 'address', name:'user'}]
              }, [accounts[0]]),
            }));

            span.innerHTML = '(Invested: ' + applyDecimals(balance, span.getAttribute('data-decimals')) + ')';
          });
        })();

        document.querySelectorAll('[data-decimals]').forEach(span => {
          span.innerHTML = applyDecimals(span.innerHTML, span.getAttribute('data-decimals'));
        });
        document.querySelectorAll('span.timestamp').forEach(span => {
          span.innerHTML = new Date(span.innerHTML * 1000).toLocaleString();
        });
        document.querySelectorAll('[data-toggle]').forEach(toggler => {
          toggler.addEventListener('click', function() {
            const el = document.getElementById(toggler.getAttribute('data-toggle'));
            el.style.display = el.style.display === 'none' ? 'block' : 'none';
          }, false);
        });

        ${userBadge.renderScript()}
      </script>
    `;
  }

}

