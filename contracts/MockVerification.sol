// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract MockVerification {
  mapping(address => uint) public expirations;
  uint constant SECONDS_PER_YEAR = 60 * 60 * 24 * 265;

  function setStatus(address account, uint expiration) external {
    if(expiration == 0) {
      expiration = block.timestamp + SECONDS_PER_YEAR;
    }
    expirations[account] = expiration;
  }

  function addressActive(address toCheck) external view returns (bool) {
    return expirations[toCheck] > block.timestamp;
  }

  function addressExpiration(address toCheck) external view returns (uint) {
    return expirations[toCheck];
  }
  function addressIdHash(address toCheck) external view returns(bytes32) {
    return keccak256(abi.encode(toCheck, expirations[toCheck]));
  }
}
