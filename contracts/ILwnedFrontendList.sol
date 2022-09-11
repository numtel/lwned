// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ILwnedBrowser.sol";
import "./IERC20.sol";

interface ILwnedFrontendList {
  function renderCollateral(ILwnedBrowser.LoanDetails memory active) external view returns(bytes memory);
  function renderToken(uint amount, IERC20 token) external view returns(bytes memory);
  function renderUserBadge(address user) external view returns(bytes memory);
}

interface ILwnedFrontendLoan {
  function render(ILwnedBrowser.LoanDetails memory active) external view returns(bytes memory);
}
