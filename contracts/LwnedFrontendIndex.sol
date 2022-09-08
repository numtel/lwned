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

  function render() external view returns(bytes memory) {
    return `
      <p>Pending loan count: ${Strings.toString(factory.pendingCount())}
        <a href="#${Strings.toHexString(pendingPage)}">View Pending...</a></p>
      <p>Issued loan count: ${Strings.toString(factory.activeCount())}</p>
      <script>
        async function submitForm(event) {
          console.log(event);
        }
        async function setToken(el) {
          const web3 = await web3ReadOnly();
          el.nextElementSibling.innerHTML = 'Loading...';
          try {
            const tokenName = decodeAscii((await web3.eth.call({
              to: el.value,
              data: web3.eth.abi.encodeFunctionSignature('name()'),
            })).slice(130)).replaceAll('\u0000','');
            el.nextElementSibling.innerHTML = tokenName;
          } catch(error) {
            el.nextElementSibling.innerHTML = 'Error reading ERC20 name!';
          }
        }
        async function addCollateral(el) {
        }
      </script>
      <form onsubmit="submitForm(this); return false;">
        <fieldset><legend>New Loan Application</legend>
        <dl>
          <dt>Token</dt>
          <dd><input name="token" required match="^0x[a-fA-F0-9]{40}$" onchange="setToken(this)"><span></span></dd>
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
          <dd>
            <button type="button" onclick="addCollateral(this)">Add Collateral...</button>
          </dd>
          <dt>Submission Statement</dt>
          <dd><textarea name="text" style="width:100%;min-height:100px;"></textarea></dd>
        </dl>
        <button type="submit">Submit</button>
        </fieldset>
      </form>
    `;
  }
}
