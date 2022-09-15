// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IERC20.sol";

interface ILoan is IERC20 {
  function factory() external view returns(address);
  function borrower() external view returns(address);
  function idHash() external view returns(bytes32);
  function token() external view returns(address);
  function status() external view returns(uint8);
  function amountToGive() external view returns(uint);
  function amountToRepay() external view returns(uint);
  function deadlineIssue() external view returns(uint);
  function deadlineRepay() external view returns(uint);
  function allCollateralTokens() external view returns(address[] memory);
  function allCollateralAmounts() external view returns(uint[] memory);
  function collateralTokens(uint index) external view returns(address);
  function collateralAmounts(uint index) external view returns(uint);
  function text() external view returns(string memory);

  event InvestmentChanged(uint oldAmount, uint newAmount);
  event LoanIssued(uint timestamp);
  event LoanRepaid(uint timestamp);
  event LoanDefaulted(uint timestamp);
  event LoanCanceled(uint timestamp);

  function invest(uint amount) external;
  function divest(uint amount) external;
  function loanIssue() external;
  function loanRepay() external;
  function loanCancel() external;
  function loanDefault() external;
}
