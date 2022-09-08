// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ILwned {
  function loansByBorrower(address account, uint index) external view returns(address);

  event NewApplication(address indexed borrower, address loan);

  function newApplication(
    address _token,
    uint _toGive,
    uint _toRepay,
    uint _deadlineIssue,
    uint _deadlineRepay,
    address[] memory _collateralTokens,
    uint[] memory _collateralAmounts,
    string memory _text
  ) external;

  function countOf(address account) external view returns(uint);
  function pendingCount() external view returns(uint);
  function pendingAt(uint index) external view returns(address);
  function activeCount() external view returns(uint);
  function activeAt(uint index) external view returns(address);
  
}

