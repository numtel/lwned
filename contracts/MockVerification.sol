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

  function addressActive(address toCheck) public view returns (bool) {
    return expirations[toCheck] > block.timestamp;
  }

  function addressExpiration(address toCheck) external view returns (uint) {
    return expirations[toCheck];
  }

  function addressIdHash(address toCheck) external view returns(bytes32) {
    if(!addressActive(toCheck)) return 0;
    return keccak256(abi.encode(toCheck, expirations[toCheck]));
  }

  function isOver18(address toCheck) external view returns (bool) {
    return expirations[toCheck] > block.timestamp;
  }

  function isOver21(address toCheck) external view returns (bool){
    return expirations[toCheck] > block.timestamp;
  }

  function getCountryCode(address toCheck) external view returns (uint){
    return expirations[toCheck] > block.timestamp ? 4587605 : 0; // "FU"
  }
}
