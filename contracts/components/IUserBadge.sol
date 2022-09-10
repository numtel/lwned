// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IUserBadge {
  function render(address account) external view returns(bytes memory);
}

