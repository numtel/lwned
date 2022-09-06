// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

library safeTransfer {
  bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
  bytes4 private constant SELECTOR_TRANSFER = bytes4(keccak256(bytes('transfer(address,uint256)')));

  function invoke(address token, address to, uint value) internal {
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR_TRANSFER, to, value));
    require(success && (data.length == 0 || abi.decode(data, (bool))), 'TRANSFER_FAILED');
  }
  function invokeFrom(address token, address from, address to, uint value) internal {
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, from, to, value));
    require(success && (data.length == 0 || abi.decode(data, (bool))), 'TRANSFER_FROM_FAILED');
  }
}
