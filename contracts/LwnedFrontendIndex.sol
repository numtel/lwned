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
      <form method="tx" action="newApplication">
        <fieldset><legend>New Loan Application</legend>
        <dl>
          <dt>Token</dt>
          <dd><input name="token" data-type="address"></dd>
          <dt>Loan Amount</dt>
          <dd><input name="toGive" data-type="uint256"></dd>
          <dt>Repayment Amount</dt>
          <dd><input name="toRepay" data-type="uint256"></dd>
          <dt>Issuance Deadline</dt>
          <dd><input name="deadlineIssue" data-type="uint256"></dd>
          <dt>Repayment Deadline</dt>
          <dd><input name="deadlineRepay" data-type="uint256"></dd>
          <dt>Collateral Tokens</dt>
          <dd><input name="collateralTokens" data-type="address[]"></dd>
          <dt>Collateral Amounts</dt>
          <dd><input name="collateralAmounts" data-type="uint256[]"></dd>
          <dt>Submission Statement</dt>
          <dd><textarea name="text" data-type="string"></textarea></dd>
        </dl>
        <button type="submit">Submit</button>
        </fieldset>
      </form>
    `;
  }

  function newApplication(
    address token,
    uint toGive,
    uint toRepay,
    uint deadlineIssue,
    uint deadlineRepay,
    address[] memory collateralTokens,
    uint[] memory collateralAmounts,
    string memory text
  ) external {
    factory.newApplication(
      token,
      toGive,
      toRepay,
      deadlineIssue,
      deadlineRepay,
      collateralTokens,
      collateralAmounts,
      text
    );
  }
}
