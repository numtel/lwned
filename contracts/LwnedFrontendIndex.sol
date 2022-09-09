// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILwned.sol";
import "./ILoan.sol";
import "./Strings.sol";

contract LwnedFrontendIndex {
  ILwned public factory;
  address public pendingPage;

  constructor(ILwned _factory, address _pendingPage) {
    factory = _factory;
    pendingPage = _pendingPage;
  }

  function tokenButton(string memory tokenAddress, string memory tokenSymbol) internal pure returns(bytes memory) {
    return `<button type="button" onclick="const el=this.parentNode.parentNode.firstElementChild; el.value='${tokenAddress}'; el.onchange(); return false">${tokenSymbol}</button>`;
  }

  function commonTokens() internal pure returns(bytes memory) {
    return `
      <div class="common">
        ${tokenButton("0x2791bca1f2de4661ed88a30c99a7a9449aa84174", "USDC")}
        ${tokenButton("0xc2132d05d31c914a87c6611c10748aeb04b58e8f", "USDT")}
        ${tokenButton("0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", "DAI")}
      </div>
    `;
  }

  function render() external view returns(bytes memory) {
    return `
      <p>Pending loan count: ${Strings.toString(factory.pendingCount())}
        <a href="#${Strings.toHexString(pendingPage)}">View Pending...</a></p>
      <p>Issued loan count: ${Strings.toString(factory.activeCount())}</p>
      <script>
        window.accounts = null;
        window.web3 = null;

        async function connect() {
          const result = await wallet();
          accounts = result.accounts;
          web3 = result.web3;
          document.getElementById('new-loan').style.display = 'block';
        }
        async function submitForm(form) {
          const tokenDecimals = form.querySelector('input[name="token"]+span').getAttribute('data-decimals');
          const collateralDecimals = Array.from(form.querySelectorAll('.collateral input+span')).map(span => span.getAttribute('data-decimals'));
          const collateralTokens = Array.from(form.querySelectorAll('.collateral input')).map((el, index) =>
                index % 2 === 0 ? el.value : undefined)
                  .filter(x => typeof x !== 'undefined');
          const collateralAmounts = Array.from(form.querySelectorAll('.collateral input')).map((el, index) =>
                index % 2 === 1 ? reverseDecimals(el.value, collateralDecimals[(index-1)/2]) : undefined)
                  .filter(x => typeof x !== 'undefined');
          // Approve collateral to factory
          for(let i = 0; i<collateralTokens.length; i++) {
            await web3.eth.sendTransaction({
              to: collateralTokens[i],
              from: accounts[0],
              data: web3.eth.abi.encodeFunctionCall({
                name: 'approve', type: 'function',
                inputs: [
                  { type: 'address', name:'spender'},
                  { type: 'uint256', name:'amount'},
                ]
              }, [
                '${Strings.toHexString(address(factory))}',
                collateralAmounts[i]
              ])
            });
          }
          // Process loan application
          await web3.eth.sendTransaction({
            to: '${Strings.toHexString(address(factory))}',
            from: accounts[0],
            data: web3.eth.abi.encodeFunctionCall({
              name: 'newApplication', type: 'function',
              inputs: [
                { type: 'address', name:'_token'},
                { type: 'uint256', name:'_toGive'},
                { type: 'uint256', name:'_toRepay'},
                { type: 'uint256', name:'_deadlineIssue'},
                { type: 'uint256', name:'_deadlineRepay'},
                { type: 'address[]', name:'_collateralTokens'},
                { type: 'uint256[]', name:'_collateralAmounts'},
                { type: 'string', name:'_text'},
              ]
            }, [
              form.querySelector('#token').value,
              reverseDecimals(form.querySelector('input[name="toGive"]').value, tokenDecimals),
              reverseDecimals(form.querySelector('input[name="toRepay"]').value, tokenDecimals),
              Math.floor((new Date(form.querySelector('input[name="deadlineIssueDate"]').value + ' ' +
                form.querySelector('input[name="deadlineIssueTime"]').value)).getTime()/1000),
              Math.floor((new Date(form.querySelector('input[name="deadlineRepayDate"]').value + ' ' +
                form.querySelector('input[name="deadlineRepayTime"]').value)).getTime()/1000),
              collateralTokens, collateralAmounts,
              form.querySelector('textarea').value,
            ]),
          });
          await loadPage();
        }
        async function setToken(el) {
          el.nextElementSibling.innerHTML = 'Loading...';
          try {
            const tokenName = web3.eth.abi.decodeParameter('string', await web3.eth.call({
              to: el.value,
              data: web3.eth.abi.encodeFunctionSignature('name()'),
            }));
            const decimals = web3.eth.abi.decodeParameter('uint8', await web3.eth.call({
              to: el.value,
              data: web3.eth.abi.encodeFunctionSignature('decimals()'),
            }));
            const balance = web3.eth.abi.decodeParameter('uint256', await web3.eth.call({
              to: el.value,
              data: web3.eth.abi.encodeFunctionCall({
                name: 'balanceOf', type: 'function',
                inputs: [{ type: 'address', name:'user'}]
              }, [accounts[0]]),
            }));
            el.nextElementSibling.setAttribute('data-balance', balance);
            el.nextElementSibling.setAttribute('data-decimals', decimals);
            el.nextElementSibling.innerHTML = tokenName + ', Balance: ' + applyDecimals(balance, decimals);
          } catch(error) {
            console.error(error);
            el.nextElementSibling.innerHTML = 'Error reading ERC20 name!';
          }
        }
        async function addCollateral(el) {
          const div = document.createElement('div');
          div.innerHTML = '<div>Token: <input name="token" required match="^0x[a-fA-F0-9]{40}$" onchange="setToken(this)"><span></span><div class="common">' + document.querySelector('.common').innerHTML + '</div></div><div>Amount: <input required></div>';
          el.parentNode.appendChild(div);
        }
      </script>
      <button onclick="connect()">Connect Wallet to Start New Loan Application</button>
      <form id="new-loan" style="display:none;" onsubmit="submitForm(this); return false;">
        <fieldset><legend>New Loan Application</legend>
        <dl>
          <dt>Token</dt>
          <dd><input name="token" id="token" required match="^0x[a-fA-F0-9]{40}$" onchange="setToken(this)"><span></span>${commonTokens()}</dd>
          <dt>Loan Amount</dt>
          <dd><input name="toGive" required></dd>
          <dt>Repayment Amount</dt>
          <dd><input name="toRepay" required></dd>
          <dt>Issuance Deadline</dt>
          <dd>
            <input name="deadlineIssueDate" required type="date">
            <input name="deadlineIssueTime" required type="time">
          </dd>
          <dt>Repayment Deadline</dt>
          <dd>
            <input name="deadlineRepayDate" required type="date">
            <input name="deadlineRepayTime" required type="time">
          </dd>
          <dt>Collateral</dt>
          <dd class="collateral">
            <button type="button" onclick="addCollateral(this)">Add Collateral...</button>
          </dd>
          <dt>Submission Statement</dt>
          <dd><textarea name="text" style="width:100%;min-height:100px;"></textarea></dd>
        </dl>
        <button type="submit">Submit</button>
        <a href="https://polygonscan.com/address/${Strings.toHexString(address(factory))}">View Contract on Explorer</a>
        </fieldset>
      </form>
    `;
  }
}
