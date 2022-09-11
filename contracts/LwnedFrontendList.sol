// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILwned.sol";
import "./ILoan.sol";
import "./ILwnedFrontendList.sol";
import "./IUserBadge.sol";
import "./Strings.sol";
import "./utils.sol";

contract LwnedFrontendList {
  ILwned public factory;
  ILwnedBrowser public browser;
  IUserBadge public userBadge;
  ILwnedFrontendLoan public activeLoan;
  ILwnedFrontendLoan public pendingLoan;

  constructor(
    ILwned _factory,
    ILwnedBrowser _browser,
    IUserBadge _userBadge,
    ILwnedFrontendLoan _activeLoan,
    ILwnedFrontendLoan _pendingLoan
  ) {
    factory = _factory;
    browser = _browser;
    userBadge = _userBadge;
    activeLoan = _activeLoan;
    pendingLoan = _pendingLoan;
  }

  function renderCollateral(ILwnedBrowser.LoanDetails memory active) public view returns(bytes memory) {
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

  function renderToken(uint amount, IERC20 token) public view returns(bytes memory) {
    return `<span data-decimals="${Strings.toString(token.decimals())}">${Strings.toString(amount)}</span> <a href="https://polygonscan.com/address/${Strings.toHexString(address(token))}">${token.symbol()}</a>`;
  }

  function renderUserBadge(address user) public view returns(bytes memory) {
    return userBadge.render(user);
  }


  function renderLoan(ILwnedBrowser.LoanDetails memory loan) internal view returns(bytes memory) {
    if(loan.status == 0) {
      return pendingLoan.render(loan);
    } else if(loan.status == 1) {
      return activeLoan.render(loan);
    } else {
      return ``;
    }
  }

  function render() external view returns(bytes memory) {
    return render(0, 0, 100);
  }

  function render(uint loanState, uint start, uint count) public view returns(bytes memory) {
    if(loanState == 0) {
      return renderList(`Pending Loans`, browser.pending(address(factory), start, count),
        start, factory.pendingCount());
    } else if(loanState == 1) {
      return renderList(`Active Loans`, browser.active(address(factory), start, count),
        start, factory.activeCount());
    }
    return ``;
  }

  function render(uint loanSide, address account, uint start, uint count) external view returns(bytes memory) {
    if(loanSide == 0) {
      return renderList(`Borrows by ${Strings.toHexString(account)}`,
        browser.byBorrower(address(factory), account, start, count),
        start, factory.countOf(account));
    } else if(loanSide == 1) {
      return renderList(`Lends by ${Strings.toHexString(account)}`,
        browser.byLender(address(factory), account, start, count),
        start, factory.countOfLender(account));
    }
    return ``;
  }

  function renderList(bytes memory title, ILwnedBrowser.LoanDetails[] memory list, uint start, uint total) internal view returns(bytes memory) {
    bytes memory listRendered;
    if(list.length == 0) {
      listRendered = `<p class="empty">Nothing found!</p>`;
    } else {
      listRendered = `
        <p>${Strings.toString(start+1)}-${Strings.toString(start+list.length)} of ${Strings.toString(total)}</p>
        <ol class="list" start="${Strings.toString(start+1)}">`;
      for(uint i = 0; i < list.length; i++) {
        listRendered = `${listRendered}${renderLoan(list[i])}`;
      }
      listRendered = `${listRendered}</ol>`;
    }
    // TODO pagination!
    return `
      <p><a href="#">Return to Index...</a></p>
      <h1>${title}</h2>
      ${listRendered}
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
            el.style.display = el.style.display === 'none' ? '' : 'none';
            el.querySelector('fieldset').style.marginTop = toggler.offsetTop;
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

        document.querySelectorAll('form').forEach(form => {
          form.addEventListener('click', function(event) {
            if(event.target.nodeName === 'FORM') form.style.display = 'none';
          }, true);
        });
      </script>
    `;
  }

}

