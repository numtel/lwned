// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ILwned {
  function loansByBorrower(address account, uint index) external view returns(address);
  function loansByBorrowerIdHash(bytes32 idHash, uint index) external view returns(address);
  function loansByLender(address account, uint index) external view returns(address);
  function loansByToken(address token, uint index) external view returns(address);
  function loansByLenderMap(address account, address loan) external view returns(bool);

  event NewApplication(address indexed borrower, address loan);

  function newApplication(
    address _token,
    uint _toGive,
    uint _toRepay,
    uint _deadlineIssue,
    uint _deadlineRepay,
    address[] memory _collateralTokens,
    uint[] memory _collateralAmounts,
    string memory _text,
    string memory _name
  ) external;

  function countOf(address account) external view returns(uint);
  function countOfIdHash(bytes32 idHash) external view returns(uint);
  function countOfLender(address account) external view returns(uint);
  function countOfToken(address token) external view returns(uint);
  function pendingCount() external view returns(uint);
  function pendingAt(uint index) external view returns(address);
  function pendingCountWithIdHash() external view returns(uint);
  function pendingAtWithIdHash(uint index) external view returns(address);
  function activeCount() external view returns(uint);
  function activeAt(uint index) external view returns(address);
  
}

